import {
  createPublicClient,
  http,
  parseUnits,
  getContract,
  defineChain,
} from "viem";
import { escrowUsdcAbi } from "./abis/escrowAbis";
import { escrowIdrxAbi } from "./abis/escrowIdrxAbi";
import { usdcAbi } from "./abis/usdcAbi";
import { idrxAbi } from "./abis/idrxAbi";
import { usdtAbi } from "./abis/usdtAbi";
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

// Define Kaia Testnet chain
export const kaiaTestnet = defineChain({
  id: 1001,
  name: "Kaia Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Kaia",
    symbol: "KAI",
  },
  rpcUrls: {
    default: {
      http: ["https://testnet.kaia.network"],
    },
    public: {
      http: ["https://testnet.kaia.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Kaia Testnet Explorer",
      url: "https://testnet.kaia.network",
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

// Wallet type detection and chain selection
export const detectWalletType = (walletClient: any): "OKX" | "LINE" | "UNKNOWN" => {
  try {
    console.log("🔍 Detecting wallet type...");
    console.log("Wallet client methods:", Object.keys(walletClient || {}));
    console.log("Window objects:", {
      hasOkxwallet: typeof window !== 'undefined' && !!(window as any).okxwallet,
      hasEthereum: typeof window !== 'undefined' && !!(window as any).ethereum,
      hasLineWallet: typeof window !== 'undefined' && !!(window as any).lineWallet
    });
    
    // PRIORITY 1: Check for OKX wallet first (most common)
    if (typeof window !== 'undefined' && (window as any).okxwallet) {
      console.log("✅ Detected OKX wallet");
      return "OKX";
    }
    
    // PRIORITY 2: Check for standard Ethereum wallets (MetaMask, etc.)
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      // Check if it's specifically OKX by looking for OKX-specific properties
      const ethereum = (window as any).ethereum;
      if (ethereum.isOKXWallet || ethereum.isOkxWallet) {
        console.log("✅ Detected OKX wallet via ethereum.isOKXWallet");
        return "OKX";
      }
      
      // Check if it's MetaMask
      if (ethereum.isMetaMask) {
        console.log("✅ Detected MetaMask wallet");
        return "OKX"; // Treat MetaMask as OKX for Base Sepolia
      }
      
      console.log("✅ Detected standard wallet (treating as OKX)");
      return "OKX"; // Default to OKX for standard wallets
    }
    
    // PRIORITY 3: Check for LINE wallet (custom implementation)
    if (walletClient && walletClient._isLineWallet) {
      console.log("✅ Detected LINE wallet via _isLineWallet");
      return "LINE";
    }
    
    // PRIORITY 4: Check for Ethereum wallet (OKX, MetaMask, etc.)
    if (walletClient && walletClient._isEthereumWallet) {
      console.log("✅ Detected Ethereum wallet via _isEthereumWallet");
      return "OKX";
    }
    
    // PRIORITY 5: Check for LINE wallet by method signature
    if (walletClient && typeof walletClient.getChainId === 'function') {
      // Check if it's our custom LINE wallet client by looking for specific LINE properties
      if (walletClient.account && walletClient.writeContract && 
          (walletClient.simulateContract || walletClient._isLineWallet)) {
        console.log("✅ Detected LINE wallet via method signature");
        return "LINE";
      }
    }
    
    // PRIORITY 6: Check for LINE wallet via window object
    if (typeof window !== 'undefined' && (window as any).lineWallet) {
      console.log("✅ Detected LINE wallet via window.lineWallet");
      return "LINE";
    }
    
    console.log("❌ Unknown wallet type");
    return "UNKNOWN";
  } catch (error) {
    console.error("Error detecting wallet type:", error);
    return "UNKNOWN";
  }
};

// Get appropriate chain based on wallet type
export const getChainForWallet = (walletType: "OKX" | "LINE" | "UNKNOWN") => {
  switch (walletType) {
    case "OKX":
      return baseSepolia;
    case "LINE":
      return kaiaTestnet;
    default:
      console.warn("Unknown wallet type, defaulting to Base Sepolia");
      return baseSepolia;
  }
};

// Smart contract instances
export const escrowContract = getContract({
  address: getEscrowAddress("USDC") as `0x${string}`, // Same contract for USDC and USDT
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

export const usdtContract = getContract({
  address: getTokenAddress("USDT") as `0x${string}`,
  abi: usdtAbi,
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
  vestingEnabled?: boolean;
  vestingDuration?: number; // in days
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

// Validate and normalize Ethereum address
export const validateAddress = (address: string): string => {
  if (!address) {
    throw new Error("Address is required");
  }
  
  // Remove any whitespace
  const cleanAddress = address.trim();
  
  // Check if it starts with 0x
  if (!cleanAddress.startsWith('0x')) {
    throw new Error(`Invalid address format: ${cleanAddress}. Address must start with '0x'`);
  }
  
  // Check length (should be 42 characters including 0x)
  if (cleanAddress.length !== 42) {
    throw new Error(`Invalid address length: ${cleanAddress}. Expected 42 characters, got ${cleanAddress.length}`);
  }
  
  // Check if it's a valid hex string
  const hexPart = cleanAddress.slice(2);
  if (!/^[0-9a-fA-F]+$/.test(hexPart)) {
    throw new Error(`Invalid address format: ${cleanAddress}. Must contain only valid hex characters`);
  }
  
  return cleanAddress.toLowerCase() as `0x${string}`;
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
  tokenType: "USDC" | "USDT" | "IDRX",
  userAddress: string,
): Promise<bigint> => {
  try {
    if (tokenType === "USDC") {
      return await usdcContract.read.balanceOf([userAddress as `0x${string}`]);
    } else if (tokenType === "USDT") {
      return await usdtContract.read.balanceOf([userAddress as `0x${string}`]);
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
  tokenType: "USDC" | "USDT" | "IDRX",
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
      ]);
    } else if (tokenType === "USDT") {
      return await usdtContract.read.allowance([
        owner as `0x${string}`,
        details[0] as `0x${string}`,
      ]);
    } else {
      return await idrxContract.read.allowance([
        owner as `0x${string}`,
        details[0] as `0x${string}`,
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
  tokenType: "USDC" | "USDT" | "IDRX",
  escrowId: string,
  amount: bigint,
): Promise<boolean> => {
  try {
    let contract;
    if (tokenType === "USDC") {
      contract = usdcContract;
    } else if (tokenType === "USDT") {
      contract = usdtContract;
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
    console.log("🔍 Verifying network...");
    console.log("Wallet client:", walletClient);
    
    // Detect wallet type and get appropriate chain
    const walletType = detectWalletType(walletClient);
    const expectedChain = getChainForWallet(walletType);
    
    console.log("📊 Wallet detection results:");
    console.log("  - Detected wallet type:", walletType);
    console.log("  - Expected chain:", expectedChain.name, `(ID: ${expectedChain.id})`);
    
    const chainId = await walletClient.getChainId();
    console.log("📊 Network verification results:");
    console.log("  - Current wallet chain ID:", chainId);
    console.log("  - Expected chain ID:", expectedChain.id);
    console.log("  - Chain ID type:", typeof chainId);
    console.log("  - Expected type:", typeof expectedChain.id);

    // Convert both to numbers for comparison
    const currentChainId = Number(chainId);
    const expectedChainId = Number(expectedChain.id);
    
    console.log("  - Current as number:", currentChainId);
    console.log("  - Expected as number:", expectedChainId);
    console.log("  - Numbers equal?", currentChainId === expectedChainId);

    if (currentChainId !== expectedChainId) {
      console.error(
        `❌ Network mismatch! Expected ${expectedChainId} (${expectedChain.name}), got ${currentChainId}`,
      );
      return false;
    }
    
    console.log(`✅ Network verification successful! Connected to ${expectedChain.name}`);
    return true;
  } catch (error) {
    console.error("❌ Error verifying network:", error);
    return false;
  }
};

// Create escrow onchain
export const createEscrowOnchain = async (
  walletClient: any,
  tokenType: "USDC" | "USDT" | "IDRX",
  escrowData: EscrowData,
): Promise<CreateEscrowResult> => {
  try {
    // Verify network first
    const isCorrectNetwork = await verifyNetwork(walletClient);
    if (!isCorrectNetwork) {
      const walletType = detectWalletType(walletClient);
      const expectedChain = getChainForWallet(walletType);
      throw new Error(
        `Please switch to ${expectedChain.name} network (Chain ID: ${expectedChain.id})`,
      );
    }

    let contract;
    if (tokenType === "IDRX") {
      contract = escrowIdrxContract;
    } else {
      contract = escrowContract; // For USDC and USDT
    }

    // Debug logging
    console.log("Creating escrow with:", {
      tokenType,
      contractAddress: contract.address,
      receivers: escrowData.receivers,
      amounts: escrowData.amounts.map((a) => a.toString()),
      sender: walletClient.account.address,
    });
    
    // Validate contract address
    if (!contract.address || !contract.address.startsWith('0x') || contract.address.length !== 42) {
      throw new Error(`Invalid contract address: ${contract.address}`);
    }

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

    const tokenAddress = validateAddress(getTokenAddress(tokenType));
    
    // Log token address for debugging
    console.log("🔍 Token address validation:", {
      tokenType,
      tokenAddress,
      isValidFormat: true, // Already validated by validateAddress
    });
    
    // Calculate vesting parameters
    const vestingStartTime = escrowData.vestingEnabled 
      ? BigInt(Math.floor(Date.now() / 1000)) // Current timestamp
      : BigInt(0);
    const vestingDuration = escrowData.vestingEnabled && escrowData.vestingDuration
      ? BigInt(escrowData.vestingDuration * 24 * 60 * 60) // Convert days to seconds
      : BigInt(0);

    // Validate and normalize receiver addresses
    const validatedReceivers = escrowData.receivers.map((receiver, index) => {
      try {
        return validateAddress(receiver);
      } catch (error) {
        throw new Error(`Invalid receiver address at index ${index}: ${receiver}. ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
    
    // Log the exact parameters being sent to the contract
    console.log("📋 Contract call parameters:", {
      function: "createEscrow",
      contractAddress: contract.address,
      tokenAddress,
      receivers: validatedReceivers,
      amounts: escrowData.amounts.map((a) => a.toString()),
      sender: walletClient.account.address,
      vestingEnabled: escrowData.vestingEnabled,
      vestingDurationDays: escrowData.vestingDuration,
      vestingStartTime: vestingStartTime.toString(),
      vestingDurationSeconds: vestingDuration.toString(),
      vestingDurationFormatted: `${vestingDuration.toString()} seconds (${(Number(vestingDuration) / (24 * 60 * 60)).toFixed(2)} days)`,
    });
    
    // Additional debugging for address validation
    console.log("🔍 Address validation details:", {
      contractAddress: {
        value: contract.address,
        length: contract.address?.length,
        startsWith0x: contract.address?.startsWith('0x'),
        isValid: contract.address?.startsWith('0x') && contract.address?.length === 42
      },
      tokenAddress: {
        value: tokenAddress,
        length: tokenAddress?.length,
        startsWith0x: tokenAddress?.startsWith('0x'),
        isValid: tokenAddress?.startsWith('0x') && tokenAddress?.length === 42
      },
      receivers: validatedReceivers.map((addr, index) => ({
        index,
        address: addr,
        length: addr?.length,
        startsWith0x: addr?.startsWith('0x'),
        isValid: addr?.startsWith('0x') && addr?.length === 42
      }))
    });

    const { request } = await contract.simulate.createEscrow(
      [tokenAddress as `0x${string}`, validatedReceivers as `0x${string}`[], escrowData.amounts, vestingStartTime, vestingDuration],
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
  tokenType: "USDC" | "USDT" | "IDRX",
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
      tokenType === "IDRX" ? escrowIdrxContract : escrowContract;

    const txHash = await walletClient.writeContract({
      address: contractAddress.address,
      abi: tokenType === "IDRX" ? escrowIdrxAbi : escrowUsdcAbi,
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
  tokenType: "USDC" | "USDT" | "IDRX",
): Promise<{ success: boolean; transactionHash?: string; error?: string }> => {
  try {
    let contract;
    if (tokenType === "IDRX") {
      contract = escrowIdrxContract;
    } else {
      contract = escrowContract; // For USDC and USDT
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
      functionName: "withdrawTokenToFiat",
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
