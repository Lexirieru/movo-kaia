import { escrowContract, escrowIdrxContract } from "./smartContract";
import {
  EscrowInfo,
  EscrowRoomDetails,
  ReceiverDetails,
} from "./smartContract";

// Get escrow details from smart contract
export const getEscrowDetailsFromContract = async (
  escrowId: string,
  tokenType: "USDC" | "IDRX",
): Promise<EscrowInfo | null> => {
  try {
    let contract;
    if (tokenType === "USDC") {
      contract = escrowContract;
    } else {
      contract = escrowIdrxContract;
    }

    // Get escrow details using the correct function
    const escrowDetails = await contract.read.getEscrowDetails([
      escrowId as `0x${string}`,
    ]);

    // Get receiver addresses
    const receiverAddresses = await contract.read.getEscrowReceivers([
      escrowId as `0x${string}`,
    ]);

    // Get receiver details for each address
    const receivers: ReceiverDetails[] = [];
    for (const receiverAddress of receiverAddresses) {
      const receiverDetails = await contract.read.getReceiverDetails([
        escrowId as `0x${string}`,
        receiverAddress,
      ]);
      receivers.push({
        receiverAddress,
        currentAllocation: receiverDetails[0], // currentAllocation
        withdrawnAmount: receiverDetails[1], // withdrawnAmount
        isActive: receiverDetails[2], // isActive
      });
    }

    return {
      escrowId,
      tokenType,
      escrowRoom: {
        sender: escrowDetails[0], // sender
        totalAllocatedAmount: escrowDetails[2], // totalAllocatedAmount
        totalDepositedAmount: escrowDetails[3], // totalDepositedAmount
        totalWithdrawnAmount: escrowDetails[4], // totalWithdrawnAmount
        availableBalance: escrowDetails[5], // availableBalance
        isActive: true, // We'll assume active for now
        createdAt: escrowDetails[6], // createdAt
        lastTopUpAt: escrowDetails[7], // lastTopUpAt
        activeReceiverCount: Number(escrowDetails[9]), // activeReceiverCount
      },
      receivers,
      totalReceivers: receivers.length,
    };
  } catch (error) {
    console.error("Error getting escrow details from contract:", error);
    return null;
  }
};

// Get all escrows for a sender
export const getSenderEscrows = async (
  senderAddress: string,
  tokenType: "USDC" | "IDRX",
): Promise<string[]> => {
  try {
    let contract;
    if (tokenType === "USDC") {
      contract = escrowContract;
    } else {
      contract = escrowIdrxContract;
    }

    const escrowIds = await contract.read.getUserEscrows([
      senderAddress as `0x${string}`,
    ]);
    return escrowIds.map((id: string) => id);
  } catch (error) {
    console.error("Error getting sender escrows:", error);
    return [];
  }
};

// Get all escrows for a receiver
export const getReceiverEscrows = async (
  receiverAddress: string,
  tokenType: "USDC" | "IDRX",
): Promise<string[]> => {
  try {
    let contract;
    if (tokenType === "USDC") {
      contract = escrowIdrxContract;
    } else {
      contract = escrowContract;
    }

    const escrowIds = await contract.read.getReceiverEscrows([
      receiverAddress as `0x${string}`,
    ]);
    return escrowIds.map((id: string) => id);
  } catch (error) {
    console.error("Error getting receiver escrows:", error);
    return [];
  }
};

// Check if receiver can claim from escrow (with vesting support)
export const canReceiverClaim = async (
  escrowId: string,
  receiverAddress: string,
  tokenType: "USDC" | "IDRX",
): Promise<{ canClaim: boolean; claimableAmount: bigint; reason?: string; vestingInfo?: any }> => {
  try {
    let contract;
    if (tokenType === "USDC") {
      contract = escrowContract;
    } else {
      contract = escrowIdrxContract;
    }

    // Get escrow details
    const escrowDetails = await contract.read.getEscrowDetails([
      escrowId as `0x${string}`,
    ]);

    // Check if escrow has available balance
    if (escrowDetails[5] <= 0) {
      // availableBalance is at index 5
      return {
        canClaim: false,
        claimableAmount: BigInt(0),
        reason: "No funds available in escrow",
      };
    }

    // Get receiver details
    const receiverDetails = await contract.read.getReceiverDetails([
      escrowId as `0x${string}`,
      receiverAddress as `0x${string}`,
    ]);

    // Check if receiver is active
    if (!receiverDetails[2]) {
      // isActive
      return {
        canClaim: false,
        claimableAmount: BigInt(0),
        reason: "Receiver is not active",
      };
    }

    // Get vesting information
    const vestingInfo = await getVestingInfo(escrowId, tokenType);
    const receiverVestingInfo = await getReceiverVestingInfo(escrowId, receiverAddress, tokenType);

    if (!vestingInfo || !receiverVestingInfo) {
      return {
        canClaim: false,
        claimableAmount: BigInt(0),
        reason: "Error getting vesting information",
      };
    }

    // Use the withdrawable amount from smart contract (which considers vesting)
    const withdrawableAmount = await getWithdrawableAmount(escrowId, receiverAddress, tokenType);

    // Check if there are funds available to claim
    if (withdrawableAmount <= 0) {
      let reason = "No funds available to claim";
      
      if (vestingInfo.isVestingEnabled) {
        const currentTime = Number(vestingInfo.currentTime);
        const vestingStartTime = Number(vestingInfo.vestingStartTime);
        const vestingEndTime = Number(vestingInfo.vestingEndTime);
        
        if (currentTime < vestingStartTime) {
          reason = `Vesting starts in ${Math.ceil((vestingStartTime - currentTime) / 86400)} days`;
        } else if (currentTime < vestingEndTime) {
          const progress = Number(receiverVestingInfo.vestingProgress) / 100;
          reason = `Vesting in progress (${progress.toFixed(1)}% vested)`;
        } else {
          reason = "All funds have been withdrawn";
        }
      }

      return {
        canClaim: false,
        claimableAmount: BigInt(0),
        reason,
        vestingInfo: {
          isVestingEnabled: vestingInfo.isVestingEnabled,
          vestingStartTime: vestingInfo.vestingStartTime,
          vestingEndTime: vestingInfo.vestingEndTime,
          currentTime: vestingInfo.currentTime,
          vestedAmount: receiverVestingInfo.vestedAmount,
          totalVestedAmount: receiverVestingInfo.totalVestedAmount,
          vestingProgress: receiverVestingInfo.vestingProgress,
        },
      };
    }

    return { 
      canClaim: true, 
      claimableAmount: withdrawableAmount, 
      reason: "Can claim",
      vestingInfo: {
        isVestingEnabled: vestingInfo.isVestingEnabled,
        vestingStartTime: vestingInfo.vestingStartTime,
        vestingEndTime: vestingInfo.vestingEndTime,
        currentTime: vestingInfo.currentTime,
        vestedAmount: receiverVestingInfo.vestedAmount,
        totalVestedAmount: receiverVestingInfo.totalVestedAmount,
        vestingProgress: receiverVestingInfo.vestingProgress,
      },
    };
  } catch (error) {
    console.error("Error checking if receiver can claim:", error);
    return {
      canClaim: false,
      claimableAmount: BigInt(0),
      reason: "Error checking claim status",
    };
  }
};

// Get escrow balance summary
export const getEscrowBalanceSummary = async (
  escrowId: string,
  tokenType: "USDC" | "IDRX",
): Promise<{
  totalAllocated: bigint;
  availableBalance: bigint;
  totalDeposited: bigint;
  totalWithdrawn: bigint;
} | null> => {
  try {
    let contract;
    if (tokenType === "USDC") {
      contract = escrowContract;
    } else {
      contract = escrowIdrxContract;
    }

    const escrowDetails = await contract.read.getEscrowDetails([
      escrowId as `0x${string}`,
    ]);

    return {
      totalAllocated: escrowDetails[2], // totalAllocatedAmount
      availableBalance: escrowDetails[5], // availableBalance
      totalDeposited: escrowDetails[3], // totalDepositedAmount
      totalWithdrawn: escrowDetails[4], // totalWithdrawnAmount
    };
  } catch (error) {
    console.error("Error getting escrow balance summary:", error);
    return null;
  }
};

// Get withdrawable amount for a receiver
export const getWithdrawableAmount = async (
  escrowId: string,
  receiverAddress: string,
  tokenType: "USDC" | "IDRX",
): Promise<bigint> => {
  try {
    let contract;
    if (tokenType === "USDC") {
      contract = escrowContract;
    } else {
      contract = escrowIdrxContract;
    }

    const withdrawableAmount = await contract.read.getWithdrawableAmount([
      escrowId as `0x${string}`,
      receiverAddress as `0x${string}`,
    ]);
    return withdrawableAmount;
  } catch (error) {
    console.error("Error getting withdrawable amount:", error);
    return BigInt(0);
  }
};

// Get vesting information for an escrow
export const getVestingInfo = async (
  escrowId: string,
  tokenType: "USDC" | "IDRX",
): Promise<{
  isVestingEnabled: boolean;
  vestingStartTime: bigint;
  vestingDuration: bigint;
  vestingEndTime: bigint;
  currentTime: bigint;
} | null> => {
  try {
    let contract;
    if (tokenType === "USDC") {
      contract = escrowContract;
    } else {
      contract = escrowIdrxContract;
    }

    const vestingInfo = await contract.read.getVestingInfo([
      escrowId as `0x${string}`,
    ]);

    return {
      isVestingEnabled: vestingInfo[0],
      vestingStartTime: vestingInfo[1],
      vestingDuration: vestingInfo[2],
      vestingEndTime: vestingInfo[3],
      currentTime: vestingInfo[4],
    };
  } catch (error) {
    console.error("Error getting vesting info:", error);
    return null;
  }
};

// Get receiver vesting information
export const getReceiverVestingInfo = async (
  escrowId: string,
  receiverAddress: string,
  tokenType: "USDC" | "IDRX",
): Promise<{
  vestedAmount: bigint;
  totalVestedAmount: bigint;
  availableToClaim: bigint;
  vestingProgress: bigint;
} | null> => {
  try {
    let contract;
    if (tokenType === "USDC") {
      contract = escrowContract;
    } else {
      contract = escrowIdrxContract;
    }

    const vestingInfo = await contract.read.getReceiverVestingInfo([
      escrowId as `0x${string}`,
      receiverAddress as `0x${string}`,
    ]);

    return {
      vestedAmount: vestingInfo[0],
      totalVestedAmount: vestingInfo[1],
      availableToClaim: vestingInfo[2],
      vestingProgress: vestingInfo[3],
    };
  } catch (error) {
    console.error("Error getting receiver vesting info:", error);
    return null;
  }
};
