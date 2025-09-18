import { escrowUsdcContract, escrowIdrxContract } from "./smartContract";
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
      contract = escrowUsdcContract;
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
        totalAllocatedAmount: escrowDetails[1], // totalAllocatedAmount
        totalDepositedAmount: escrowDetails[2], // totalDepositedAmount
        totalWithdrawnAmount: escrowDetails[3], // totalWithdrawnAmount
        availableBalance: escrowDetails[4], // availableBalance
        isActive: escrowDetails[5], // isActive
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
      contract = escrowUsdcContract;
    } else {
      contract = escrowIdrxContract;
    }

    const escrowIds = await contract.read.getUserEscrows([
      senderAddress as `0x${string}`,
    ]);
    return escrowIds.map((id) => id);
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
      contract = escrowUsdcContract;
    }

    const escrowIds = await contract.read.getReceiverEscrows([
      receiverAddress as `0x${string}`,
    ]);
    return escrowIds.map((id) => id);
  } catch (error) {
    console.error("Error getting receiver escrows:", error);
    return [];
  }
};

// Check if receiver can claim from escrow
export const canReceiverClaim = async (
  escrowId: string,
  receiverAddress: string,
  tokenType: "USDC" | "IDRX",
): Promise<{ canClaim: boolean; claimableAmount: bigint; reason?: string }> => {
  try {
    let contract;
    if (tokenType === "USDC") {
      contract = escrowUsdcContract;
    } else {
      contract = escrowIdrxContract;
    }

    // Get escrow balance info
    const balanceInfo = await contract.read.getEscrowBalance([
      escrowId as `0x${string}`,
    ]);

    // Check if escrow has available balance
    if (balanceInfo[1] <= 0) {
      // availableBalance
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

    // Calculate claimable amount
    const claimableAmount = receiverDetails[0] - receiverDetails[1]; // currentAllocation - withdrawnAmount

    // Check if there are funds available to claim
    if (claimableAmount <= 0) {
      return {
        canClaim: false,
        claimableAmount: BigInt(0),
        reason: "No funds available to claim",
      };
    }

    // Check if escrow has sufficient available balance
    if (balanceInfo[1] < claimableAmount) {
      // availableBalance
      return {
        canClaim: false,
        claimableAmount: BigInt(0),
        reason: "Insufficient escrow balance",
      };
    }

    return { canClaim: true, claimableAmount, reason: "Can claim" };
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
      contract = escrowUsdcContract;
    } else {
      contract = escrowIdrxContract;
    }

    const balanceInfo = await contract.read.getEscrowBalance([
      escrowId as `0x${string}`,
    ]);

    return {
      totalAllocated: balanceInfo[0], // totalAllocated
      availableBalance: balanceInfo[1], // availableBalance
      totalDeposited: balanceInfo[2], // totalDeposited
      totalWithdrawn: balanceInfo[3], // totalWithdrawn
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
      contract = escrowUsdcContract;
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
