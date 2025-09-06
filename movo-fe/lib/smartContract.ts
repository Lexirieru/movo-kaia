import {
  createPublicClient,
  http,
  parseUnits,
  getContract,
  defineChain,
} from "viem";
import { escrowUsdcAbi } from "./abis/escrowUsdcAbi";
import { escrowIdrxAbi } from "./abis/escrowIdrxAbi";
import { usdcAbi } from "./abis/usdcAbi";
import { idrxAbi } from "./abis/idrxAbi";
import { getEscrowAddress, getTokenAddress } from "./contractConfig";

// Define Base Sepolia chain with correct Chain ID
export const baseSepolia = defineChain({
  id: 84532,
  name: "Base Sepolia",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["https://sepolia.base.org"],
    },
    public: {
      http: ["https://sepolia.base.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "Base Sepolia Explorer",
      url: "https://sepolia.basescan.org",
    },
  },
});

// Public client for reading blockchain data
export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

// Debug: Log the chain configuration
console.log("Public client configured with chain:", {
  id: baseSepolia.id,
  name: baseSepolia.name,
});

// Smart contract instances
export const escrowUsdcContract = getContract({
  address: getEscrowAddress("USDC") as `0x${string}`,
  abi: escrowUsdcAbi,
  client: publicClient,
});

export const escrowIdrxContract = getContract({
  address: getEscrowAddress("IDRX") as `0x${string}`,
  abi: escrowIdrxAbi,
  client: publicClient,
});

export const usdcContract = getContract({
  address: getTokenAddress("USDC") as `0x${string}`,
  abi: usdcAbi,
  client: publicClient,
});

export const idrxContract = getContract({
  address: getTokenAddress("IDRX") as `0x${string}`,
  abi: idrxAbi,
  client: publicClient,
});

// Types
export interface EscrowData {
  receivers: `0x${string}`[];
  amounts: bigint[];
  totalAmount: bigint;
}

export interface CreateEscrowResult {
  success: boolean;
  escrowId?: string;
  transactionHash?: string;
  error?: string;
}

// New types for escrow details
export interface EscrowRoomDetails {
  sender: `0x${string}`;
  totalAllocatedAmount: bigint;
  totalDepositedAmount: bigint;
  totalWithdrawnAmount: bigint;
  availableBalance: bigint;
  isActive: boolean;
  createdAt: bigint;
  lastTopUpAt: bigint;
  activeReceiverCount: number;
}

export interface ReceiverDetails {
  receiverAddress: `0x${string}`;
  currentAllocation: bigint;
  withdrawnAmount: bigint;
  isActive: boolean;
}

export interface EscrowInfo {
  escrowId: string;
  tokenType: "USDC" | "IDRX";
  escrowRoom: EscrowRoomDetails;
  receivers: ReceiverDetails[];
  totalReceivers: number;
}

export interface AddReceiverResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

// Utility functions
export const generateEscrowId = (sender: string, timestamp: number): string => {
  return `escrow_${sender}_${timestamp}`;
};

export const parseTokenAmount = (
  amount: string,
  decimals: number = 6,
): bigint => {
  console.log(`Parsing amount: ${amount} with ${decimals} decimals`);
  const result = parseUnits(amount, decimals);
  console.log(`Parsed result: ${result.toString()}`);
  return result;
};

export const formatTokenAmount = (
  amount: bigint,
  decimals: number = 6,
): string => {
  return (Number(amount) / Math.pow(10, decimals)).toString();
};

// Check token balance
export const checkTokenBalance = async (
  tokenType: "USDC" | "IDRX",
  userAddress: string,
): Promise<bigint> => {
  try {
    if (tokenType === "USDC") {
      return await usdcContract.read.balanceOf([userAddress as `0x${string}`]);
    } else {
      return await idrxContract.read.balanceOf([userAddress as `0x${string}`]);
    }
  } catch (error) {
    console.error("Error checking token balance:", error);
    return BigInt(0);
  }
};

// Check token allowance
export const checkTokenAllowance = async (
  tokenType: "USDC" | "IDRX",
  owner: string,
  escrowId: string,
): Promise<bigint> => {
  try {
    console.log(escrowId);
    const details = await escrowIdrxContract.read.getEscrowDetails([
      escrowId as `0x${string}`,
    ]);
    console.log(details);
    if (tokenType === "USDC") {
      return await usdcContract.read.allowance([
        owner as `0x${string}`,
        details[0] as `0x${string}`,
        // spender as `0x${string}`,
      ]);
    } else {
      return await idrxContract.read.allowance([
        owner as `0x${string}`,
        details[0] as `0x${string}`,
        // spender as `0x${string}`,
      ]);
    }
  } catch (error) {
    console.error("Error checking token allowance:", error);
    return BigInt(0);
  }
};

// Approve tokens for escrow contract
export const approveTokens = async (
  walletClient: any,
  tokenType: "USDC" | "IDRX",
  escrowId: string,
  amount: bigint,
): Promise<boolean> => {
  try {
    let contract;
    if (tokenType === "USDC") {
      contract = usdcContract;
    } else {
      contract = idrxContract;
    }

    const details = await escrowIdrxContract.read.getEscrowDetails([
      escrowId as `0x${string}`,
    ]);

    const { request } = await contract.simulate.approve(
      [details[0] as `0x${string}`, amount],
      {
        account: walletClient.account.address,
      },
    );

    const hash = await walletClient.writeContract(request);
    await publicClient.waitForTransactionReceipt({ hash });

    return true;
  } catch (error) {
    console.error("Error approving tokens:", error);
    return false;
  }
};

// Verify wallet is on correct network
export const verifyNetwork = async (walletClient: any): Promise<boolean> => {
  try {
    const chainId = await walletClient.getChainId();
    console.log(chainId);
    console.log("Current wallet chain ID:", chainId);
    console.log("Expected chain ID:", baseSepolia.id);

    if (chainId !== baseSepolia.id) {
      console.error(
        `Network mismatch! Expected ${baseSepolia.id} (Base Sepolia), got ${chainId}`,
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error verifying network:", error);
    return false;
  }
};

// Create escrow onchain
export const createEscrowOnchain = async (
  walletClient: any,
  tokenType: "USDC" | "IDRX",
  escrowData: EscrowData,
): Promise<CreateEscrowResult> => {
  try {
    // Verify network first
    const isCorrectNetwork = await verifyNetwork(walletClient);
    if (!isCorrectNetwork) {
      throw new Error(
        `Please switch to Base Sepolia network (Chain ID: ${baseSepolia.id})`,
      );
    }

    let contract;
    if (tokenType === "USDC") {
      contract = escrowUsdcContract;
    } else {
      contract = escrowIdrxContract;
    }

    // Debug logging
    console.log("Creating escrow with:", {
      tokenType,
      contractAddress: contract.address,
      receivers: escrowData.receivers,
      amounts: escrowData.amounts.map((a) => a.toString()),
      sender: walletClient.account.address,
    });

    // Verify contract has the function
    try {
      const contractCode = await publicClient.getBytecode({
        address: contract.address,
      });
      if (!contractCode || contractCode === "0x") {
        throw new Error(
          `No contract found at address ${contract.address}. Please check if the contract is deployed on Base Sepolia.`,
        );
      }
      console.log("✅ Contract code found at address:", contract.address);
    } catch (error) {
      console.error("Error checking contract code:", error);
      throw new Error(
        `Contract not found at address ${contract.address}. Please check if the contract is deployed on Base Sepolia.`,
      );
    }

    // Log the exact parameters being sent to the contract
    console.log("📋 Contract call parameters:", {
      function: "createEscrow",
      receivers: escrowData.receivers,
      amounts: escrowData.amounts.map((a) => a.toString()),
      sender: walletClient.account.address,
    });

    const { request } = await contract.simulate.createEscrow(
      [escrowData.receivers, escrowData.amounts],
      {
        account: walletClient.account.address,
      },
    );

    console.log("✅ Simulation successful, executing transaction...");
    const hash = await walletClient.writeContract(request);
    console.log("📝 Transaction submitted:", hash);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("✅ Transaction confirmed:", receipt);

    return {
      success: true,
      transactionHash: hash,
    };
  } catch (error) {
    console.error("❌ Error creating escrow:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export async function addReceiver(
  walletClient: any,
  tokenType: "USDC" | "IDRX",
  escrowId: string,
  receiverAddress: `0x${string}`,
  amount: bigint,
): Promise<AddReceiverResult> {
  try {
    console.log("Adding receiver to escrow:", {
      tokenType,
      escrowId,
      receiverAddress,
      amount: amount.toString(),
    });

    const contractAddress =
      tokenType == "USDC" ? escrowUsdcContract : escrowIdrxContract;

    const txHash = await walletClient.writeContract({
      address: contractAddress,
      abi: escrowUsdcAbi || escrowIdrxAbi,
      functionName: "addReceiver",
      args: [escrowId, receiverAddress, amount],
    });

    console.log("Add receiver transaction sent: ", txHash);

    const receipt = await walletClient.waitForTransactionReceipt(txHash);

    if (receipt.status == "success") {
      console.log("Receiver added successfully:", receipt);
      return {
        success: true,
        transactionHash: txHash,
      };
    } else {
      return {
        success: false,
        error: "Transaction failed",
      };
    }
  } catch (error) {
    console.error("Error adding receiver to escrow:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occured",
    };
  }
}

// Topup funds to escrow
export const topUpFunds = async (
  walletClient: any,
  escrowId: string,
  amount: bigint,
  tokenType: "USDC" | "IDRX",
): Promise<{ success: boolean; transactionHash?: string; error?: string }> => {
  try {
    let contract;
    if (tokenType === "USDC") {
      contract = escrowUsdcContract;
    } else {
      contract = escrowIdrxContract;
    }

    //    {
    //   inputs: [
    //     { internalType: "bytes32", name: "_escrowId", type: "bytes32" },
    //     { internalType: "uint256", name: "_amount", type: "uint256" },
    //   ],
    //   name: "topUpFunds",
    //   outputs: [],
    //   stateMutability: "nonpayable",
    //   type: "function",
    // },

    // escrowId :0x961497dd1a35f330dc1578ec978c6813d026361df4f7a766360c1704d676c8a3
    // amount : 5000000n

    const { request } = await contract.simulate.topUpFunds(
      [escrowId as `0x${string}`, amount],
      {
        account: walletClient.account.address,
      },
    );
    console.log("dibawah");

    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return {
      success: true,
      transactionHash: hash,
    };
  } catch (error) {
    console.error("Error topping up funds:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

// Withdraw USDC to Fiat
export const withdrawUSDCTofiat = async (
  walletClient: any,
  escrowId: string,
  amount: bigint,
  depositWalletAddress: `0x${string}`,
): Promise<{ success: boolean; transactionHash?: string; error?: string }> => {
  try {
    // Kirim tx
    const hash = await walletClient.writeContract({
      address: getEscrowAddress("USDC"),
      abi: escrowUsdcAbi,
      functionName: "withdrawUSDCTofiat",
      args: [escrowId, amount, depositWalletAddress],
    });

    // Tunggu receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === "success") {
      console.log("✅ Withdraw successful:", receipt);
      return {
        success: true,
        transactionHash: hash,
      };
    } else {
      return {
        success: false,
        error: "Transaction failed",
      };
    }
  } catch (error) {
    console.error("❌ Error withdrawing USDC to fiat:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
