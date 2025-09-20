import {
  createPublicClient,
  http,
  parseUnits,
  getContract,
  defineChain,
} from "viem";
import { escrowAbis } from "./abis/escrowAbis";
import { escrowIdrxAbis } from "./abis/escrowIdrxAbis";
import { usdcAbis } from "./abis/usdcAbis";
import { usdtAbis } from "./abis/usdtAbis";
import { idrxAbis } from "./abis/idrxAbis";
import {
  getEscrowAddress,
  getTokenAddress,
  getTokenDecimals,
} from "./contractConfig";

// Import saveEscrowEventWithContext function
const saveEscrowEventWithContext = async (
  eventType: string,
  escrowId: string,
  transactionHash: string,
  userAddress: string,
  tokenType: string,
  eventData: any,
  receipt: any,
  contractAddress: string,
) => {
  // This function should be implemented to save escrow events
  // For now, we'll just log the event
  console.log("Saving escrow event:", {
    eventType,
    escrowId,
    transactionHash,
    userAddress,
    tokenType,
    eventData,
    contractAddress,
  });
};

export type TokenType = "USDC" | "USDT" | "IDRX_KAIA" | "IDRX_BASE";

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
      http: [
        "https://sepolia.base.org",
        "https://base-sepolia.g.alchemy.com/v2/demo",
        "https://base-sepolia.api.onfinality.io/public",
      ],
      webSocket: ["wss://sepolia.base.org"],
    },
    public: {
      http: [
        "https://sepolia.base.org",
        "https://base-sepolia.g.alchemy.com/v2/demo",
        "https://base-sepolia.api.onfinality.io/public",
      ],
      webSocket: ["wss://sepolia.base.org"],
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
export const detectWalletType = (
  walletClient: any,
): "OKX" | "LINE" | "UNKNOWN" => {
  try {
    console.log("🔍 Detecting wallet type...");
    console.log("Wallet client methods:", Object.keys(walletClient || {}));
    console.log("Window objects:", {
      hasOkxwallet:
        typeof window !== "undefined" && !!(window as any).okxwallet,
      hasEthereum: typeof window !== "undefined" && !!(window as any).ethereum,
      hasLineWallet:
        typeof window !== "undefined" && !!(window as any).lineWallet,
    });

    // PRIORITY 1: Check for LINE wallet first (since we're using LINE Wallet SDK)
    if (walletClient && walletClient._isLineWallet) {
      console.log("✅ Detected LINE wallet via _isLineWallet");
      return "LINE";
    }

    // PRIORITY 2: Check for LINE wallet via window object
    if (typeof window !== "undefined" && (window as any).lineWallet) {
      console.log("✅ Detected LINE wallet via window.lineWallet");
      return "LINE";
    }

    // PRIORITY 3: Check for LINE wallet by method signature
    if (walletClient && typeof walletClient.getChainId === "function") {
      // Check if it's our custom LINE wallet client by looking for specific LINE properties
      if (
        walletClient.account &&
        walletClient.writeContract &&
        (walletClient.simulateContract || walletClient._isLineWallet)
      ) {
        console.log("✅ Detected LINE wallet via method signature");
        return "LINE";
      }
    }

    // PRIORITY 4: Check for OKX wallet
    if (typeof window !== "undefined" && (window as any).okxwallet) {
      console.log("✅ Detected OKX wallet");
      return "OKX";
    }

    // PRIORITY 5: Check for standard Ethereum wallets (MetaMask, etc.)
    if (typeof window !== "undefined" && (window as any).ethereum) {
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

    // PRIORITY 6: Check for Ethereum wallet (OKX, MetaMask, etc.)
    if (walletClient && walletClient._isEthereumWallet) {
      console.log("✅ Detected Ethereum wallet via _isEthereumWallet");
      return "OKX";
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
      return baseSepolia; // LINE wallet now uses Base Sepolia
    default:
      console.warn("Unknown wallet type, defaulting to Base Sepolia");
      return baseSepolia;
  }
};

// Smart contract instances
export const escrowContract = getContract({
  address: getEscrowAddress("USDC") as `0x${string}`, // Same contract for USDC and USDT
  abi: escrowAbis,
  client: publicClient,
});

export const escrowIdrxContract = getContract({
  address: getEscrowAddress("IDRX_BASE") as `0x${string}`,
  abi: escrowIdrxAbis,
  client: publicClient,
});
// export const escrowIdrxContract = getContract({
//   address: getEscrowAddress("IDRX") as `0x${string}`,
//   abi: escrowIdrxAbis,
//   client: publicClient,
// });

export const usdcContract = getContract({
  address: getTokenAddress("USDC") as `0x${string}`,
  abi: usdcAbis,
  client: publicClient,
});

export const usdtContract = getContract({
  address: getTokenAddress("USDT") as `0x${string}`,
  abi: usdtAbis,
  client: publicClient,
});

export const idrxContract = getContract({
  address: getTokenAddress("IDRX_BASE") as `0x${string}`,
  abi: idrxAbis,
  client: publicClient,
});
// export const idrxContract = getContract({
//   address: getTokenAddress("IDRX") as `0x${string}`,
//   abi: idrxAbis,
//   client: publicClient,
// });

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
  if (!cleanAddress.startsWith("0x")) {
    throw new Error(
      `Invalid address format: ${cleanAddress}. Address must start with '0x'`,
    );
  }

  // Check length (should be 42 characters including 0x)
  if (cleanAddress.length !== 42) {
    throw new Error(
      `Invalid address length: ${cleanAddress}. Expected 42 characters, got ${cleanAddress.length}`,
    );
  }

  // Check if it's a valid hex string
  const hexPart = cleanAddress.slice(2);
  if (!/^[0-9a-fA-F]+$/.test(hexPart)) {
    throw new Error(
      `Invalid address format: ${cleanAddress}. Must contain only valid hex characters`,
    );
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
  try {
    // Convert BigInt to string to avoid precision loss
    const amountStr = amount.toString();

    // Handle edge cases
    if (amountStr === "0") {
      return "0.0";
    }

    // Handle the decimal conversion manually to avoid precision issues
    if (amountStr.length <= decimals) {
      // Amount is less than 1 unit
      // Use a safer approach for padding
      const paddedAmount =
        "0".repeat(decimals + 1 - amountStr.length) + amountStr;
      const integerPart = paddedAmount.slice(0, -decimals) || "0";
      const decimalPart = paddedAmount.slice(-decimals);
      return `${integerPart}.${decimalPart}`;
    } else {
      // Amount is 1 unit or more
      const integerPart = amountStr.slice(0, -decimals);
      const decimalPart = amountStr.slice(-decimals);
      return `${integerPart}.${decimalPart}`;
    }
  } catch (error) {
    console.error("Error formatting token amount:", error);
    // Fallback to simple division for very large numbers
    const divisor = BigInt(Math.pow(10, decimals));
    const integerPart = amount / divisor;
    const decimalPart = amount % divisor;
    return `${integerPart}.${decimalPart.toString().padStart(decimals, "0")}`;
  }
};

// Helper function to extract escrow ID from transaction logs
export const extractEscrowIdFromLogs = (receipt: any): string | null => {
  try {
    if (!receipt.logs || receipt.logs.length === 0) {
      return null;
    }

    // Look for EscrowCreated event in logs
    // This is a simplified version - you might need to decode the logs properly
    for (const log of receipt.logs) {
      if (log.topics && log.topics.length > 0) {
        // The first topic is usually the event signature
        // The escrow ID might be in the second topic or in the data field
        if (log.topics.length > 1) {
          return log.topics[1]; // Often the escrow ID is the first indexed parameter
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error extracting escrow ID from logs:", error);
    return null;
  }
};

// Check token balance
export const checkTokenBalance = async (
  tokenType: TokenType,
  // tokenType: "USDC" | "USDT" | "IDRX",
  userAddress: string,
): Promise<bigint> => {
  try {
    const tokenAddress = getTokenAddress(tokenType);
    // Use a basic ERC20 ABI for balanceOf function
    const balance = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: [
        {
          inputs: [
            { internalType: "address", name: "account", type: "address" },
          ],
          name: "balanceOf",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "balanceOf",
      args: [userAddress as `0x${string}`],
    });
    return balance as bigint;
  } catch (error) {
    console.error("Error checking token balance:", error);
    return BigInt(0);
  }
};

// Check token allowance
export const checkTokenAllowance = async (
  // tokenType: "USDC" | "USDT" | "IDRX",
  tokenType: TokenType,
  owner: string,
  escrowId: string,
): Promise<bigint> => {
  try {
    console.log("🔍 Checking allowance for escrowId:", escrowId);

    // Get the correct escrow contract address based on token type
    let escrowContractAddress;
    if (tokenType === "IDRX_BASE") {
      escrowContractAddress = getEscrowAddress("IDRX_BASE");
    } else if (tokenType === "IDRX_KAIA") {
      escrowContractAddress = getEscrowAddress("IDRX_KAIA");
    } else {
      // For USDC and USDT, use the regular escrow contract
      escrowContractAddress = getEscrowAddress("USDC");
    }
    // if (tokenType === "IDRX") {
    //   escrowContractAddress = getEscrowAddress("IDRX");
    // } else {
    //   // For USDC and USDT, use the regular escrow contract
    //   escrowContractAddress = getEscrowAddress("USDC");
    // }

    console.log(
      "🔍 Escrow contract address for allowance:",
      escrowContractAddress,
    );

    const tokenAddress = getTokenAddress(tokenType);
    const allowance = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: [
        {
          inputs: [
            { internalType: "address", name: "owner", type: "address" },
            { internalType: "address", name: "spender", type: "address" },
          ],
          name: "allowance",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "allowance",
      args: [owner as `0x${string}`, escrowContractAddress as `0x${string}`],
    });

    console.log("🔍 Current allowance:", allowance.toString());
    return allowance as bigint;
  } catch (error) {
    console.error("❌ Error checking token allowance:", error);
    return BigInt(0);
  }
};

// Approve tokens for escrow contract
export const approveTokens = async (
  walletClient: any,
  tokenType: TokenType,
  // tokenType: "USDC" | "USDT" | "IDRX",
  escrowId: string,
  amount: bigint,
): Promise<boolean> => {
  try {
    const tokenAddress = getTokenAddress(tokenType);

    // Get the correct escrow contract address based on token type
    let escrowContractAddress;
    if (tokenType === "IDRX_BASE") {
      escrowContractAddress = getEscrowAddress("IDRX_BASE");
    } else if (tokenType === "IDRX_KAIA") {
      escrowContractAddress = getEscrowAddress("IDRX_KAIA");
    } else {
      // For USDC and USDT, use the regular escrow contract
      escrowContractAddress = getEscrowAddress("USDC");
    }
    // if (tokenType === "IDRX") {
    //   escrowContractAddress = getEscrowAddress("IDRX");
    // } else {
    //   // For USDC and USDT, use the regular escrow contract
    //   escrowContractAddress = getEscrowAddress("USDC");
    // }

    console.log("🔍 Approve tokens debug:", {
      tokenType,
      tokenAddress,
      escrowContractAddress,
      amount: amount.toString(),
      escrowId,
    });

    // Validate escrow contract address
    if (
      !escrowContractAddress ||
      escrowContractAddress === "0x0000000000000000000000000000000000000000"
    ) {
      throw new Error("Invalid escrow contract address");
    }

    const { request } = await publicClient.simulateContract({
      address: tokenAddress as `0x${string}`,
      abi: [
        {
          inputs: [
            { internalType: "address", name: "spender", type: "address" },
            { internalType: "uint256", name: "value", type: "uint256" },
          ],
          name: "approve",
          outputs: [{ internalType: "bool", name: "", type: "bool" }],
          stateMutability: "nonpayable",
          type: "function",
        },
      ],
      functionName: "approve",
      args: [escrowContractAddress as `0x${string}`, amount],
      account: walletClient.account.address,
    });

    console.log(
      "✅ Approval simulation successful, proceeding with transaction",
    );

    const hash = await walletClient.writeContract(request);
    await publicClient.waitForTransactionReceipt({ hash });

    console.log("✅ Approval transaction successful:", hash);
    return true;
  } catch (error) {
    console.error("❌ Error approving tokens:", error);
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
    console.log(
      "  - Expected chain:",
      expectedChain.name,
      `(ID: ${expectedChain.id})`,
    );

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

    console.log(
      `✅ Network verification successful! Connected to ${expectedChain.name}`,
    );
    return true;
  } catch (error) {
    console.error("❌ Error verifying network:", error);
    return false;
  }
};

// Create escrow onchain
export const createEscrowOnchain = async (
  walletClient: any,
  tokenType: TokenType,
  // tokenType: "USDC" | "USDT" | "IDRX",
  escrowData: EscrowData,
  userId?: string,
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
    if (tokenType === "IDRX_KAIA" || tokenType === "IDRX_BASE") {
      contract = escrowIdrxContract;
    } else {
      contract = escrowContract; // For USDC and USDT
    }
    // if (tokenType === "IDRX") {
    //   contract = escrowIdrxContract;
    // } else {
    //   contract = escrowContract; // For USDC and USDT
    // }

    // Debug logging
    console.log("Creating escrow with:", {
      tokenType,
      contractAddress: contract.address,
      receivers: escrowData.receivers,
      amounts: escrowData.amounts.map((a) => a.toString()),
      sender: walletClient.account.address,
    });

    // Validate wallet client account
    if (!walletClient.account || !walletClient.account.address) {
      throw new Error(
        "Wallet client account is not available. Please reconnect your wallet.",
      );
    }

    console.log("🔍 Wallet client validation:", {
      hasAccount: !!walletClient.account,
      accountAddress: walletClient.account.address,
      accountType: walletClient.account.type,
    });

    // Validate contract address
    if (
      !contract.address ||
      !contract.address.startsWith("0x") ||
      contract.address.length !== 42
    ) {
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

    // Check if token contract exists on the network
    try {
      const tokenCode = await publicClient.getBytecode({
        address: tokenAddress as `0x${string}`,
      });
      if (!tokenCode || tokenCode === "0x") {
        throw new Error(
          `Token contract not found at address ${tokenAddress}. Please check if the ${tokenType} token is deployed on Base Sepolia.`,
        );
      }
      console.log(
        `✅ ${tokenType} token contract found at address:`,
        tokenAddress,
      );
    } catch (error) {
      console.error(`❌ Error checking ${tokenType} token contract:`, error);
      throw new Error(
        `Token contract not found at address ${tokenAddress}. Please check if the ${tokenType} token is deployed on Base Sepolia.`,
      );
    }

    // Calculate vesting parameters
    const vestingStartTime = escrowData.vestingEnabled
      ? BigInt(Math.floor(Date.now() / 1000)) // Current timestamp
      : BigInt(0);
    const vestingDuration =
      escrowData.vestingEnabled && escrowData.vestingDuration
        ? BigInt(escrowData.vestingDuration * 24 * 60 * 60) // Convert days to seconds
        : BigInt(0);

    // Validate and normalize receiver addresses
    const validatedReceivers = escrowData.receivers.map((receiver, index) => {
      try {
        return validateAddress(receiver);
      } catch (error) {
        throw new Error(
          `Invalid receiver address at index ${index}: ${receiver}. ${error instanceof Error ? error.message : "Unknown error"}`,
        );
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

    // Log the exact arguments array that will be sent to the contract
    const contractArgs = [
      tokenAddress as `0x${string}`,
      validatedReceivers as `0x${string}`[],
      escrowData.amounts,
      vestingStartTime,
      vestingDuration,
    ];
    console.log("🔍 Contract arguments array:", {
      args: contractArgs,
      argsLength: contractArgs.length,
      argTypes: contractArgs.map((arg, index) => ({
        index,
        type: typeof arg,
        isArray: Array.isArray(arg),
        value: Array.isArray(arg) ? arg : arg.toString(),
      })),
    });

    // Detailed logging for each argument
    console.log("🔍 Detailed argument analysis:", {
      tokenAddress: {
        value: tokenAddress,
        length: tokenAddress.length,
        startsWith0x: tokenAddress.startsWith("0x"),
        isLowerCase: tokenAddress === tokenAddress.toLowerCase(),
        hasInvalidChars: !/^0x[0-9a-f]+$/.test(tokenAddress),
      },
      receivers: validatedReceivers.map((addr, index) => ({
        index,
        address: addr,
        length: addr.length,
        startsWith0x: addr.startsWith("0x"),
        isLowerCase: addr === addr.toLowerCase(),
        hasInvalidChars: !/^0x[0-9a-f]+$/.test(addr),
      })),
      amounts: escrowData.amounts.map((amount, index) => ({
        index,
        value: amount.toString(),
        isBigInt: typeof amount === "bigint",
      })),
    });

    // Additional debugging for address validation
    console.log("🔍 Address validation details:", {
      contractAddress: {
        value: contract.address,
        length: contract.address?.length,
        startsWith0x: contract.address?.startsWith("0x"),
        isValid:
          contract.address?.startsWith("0x") && contract.address?.length === 42,
      },
      tokenAddress: {
        value: tokenAddress,
        length: tokenAddress?.length,
        startsWith0x: tokenAddress?.startsWith("0x"),
        isValid: tokenAddress?.startsWith("0x") && tokenAddress?.length === 42,
      },
      receivers: validatedReceivers.map((addr, index) => ({
        index,
        address: addr,
        length: addr?.length,
        startsWith0x: addr?.startsWith("0x"),
        isValid: addr?.startsWith("0x") && addr?.length === 42,
      })),
    });

    const { request } = await contract.simulate.createEscrow(
      [
        tokenAddress as `0x${string}`,
        validatedReceivers as `0x${string}`[],
        escrowData.amounts,
        vestingStartTime,
        vestingDuration,
      ],
      {
        account: walletClient.account.address,
      },
    );

    console.log("✅ Simulation successful, executing transaction...");

    // Ensure ABI is included in the request
    const requestWithAbi = {
      ...request,
      abi:
        tokenType === "IDRX_KAIA" || tokenType === "IDRX_BASE"
          ? escrowIdrxAbis
          : escrowAbis, // Use correct ABI
    };
    // const requestWithAbi = {
    //   ...request,
    //   abi: tokenType === "IDRX" ? escrowIdrxAbis : escrowAbis, // Use correct ABI
    // };

    // Use the request directly from simulation, but ensure account is correct
    console.log("🔍 Request details before execution:", {
      address: requestWithAbi.address,
      abi: requestWithAbi.abi ? "present" : "missing",
      abiLength: requestWithAbi.abi ? requestWithAbi.abi.length : 0,
      functionName: requestWithAbi.functionName,
      args: requestWithAbi.args,
      account: requestWithAbi.account,
      value: requestWithAbi.value,
    });

    // Execute the transaction using the simulated request with ABI
    const hash = await walletClient.writeContract(requestWithAbi);
    console.log("📝 Transaction submitted:", hash);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("✅ Transaction confirmed:", receipt);

    // Extract escrow ID from transaction logs or generate one
    let escrowId = extractEscrowIdFromLogs(receipt);
    if (!escrowId) {
      escrowId = `escrow_${walletClient.account.address}_${Date.now()}`;
      console.log(
        "⚠️ Could not extract escrow ID from logs, using generated ID:",
        escrowId,
      );
    } else {
      console.log("✅ Extracted escrow ID from logs:", escrowId);
    }

    // Save escrow event for tracking with enhanced context
    const totalAmount = escrowData.amounts.reduce(
      (sum, amount) => sum + amount,
      BigInt(0),
    );

    // Convert amounts to string format and map receivers
    const recipients = escrowData.receivers.map((receiver, index) => ({
      walletAddress: validateAddress(receiver),
      amount: formatTokenAmount(
        escrowData.amounts[index],
        tokenType === "IDRX_KAIA" || tokenType === "IDRX_BASE" ? 18 : 6,
      ),
      // amount: formatTokenAmount(
      //   escrowData.amounts[index],
      //   tokenType === "IDRX" ? 2 : 6,
      // ),
      fullname: "Unknown User", // Will be resolved in backend
    }));

    // Enhanced event data with more context
    const eventData = {
      totalAmount: formatTokenAmount(
        totalAmount,
        tokenType === "IDRX_KAIA" || tokenType === "IDRX_BASE" ? 18 : 6,
        // tokenType === "IDRX" ? 18 : 6,
      ),
      recipients: recipients,
      vestingEnabled: escrowData.vestingEnabled || false,
      vestingDuration: escrowData.vestingDuration || 0,
      recipientsCount: recipients.length,
      averageAmount: formatTokenAmount(
        totalAmount / BigInt(recipients.length),
        tokenType === "IDRX_KAIA" || tokenType === "IDRX_BASE" ? 18 : 6,
        // tokenType === "IDRX" ? 18 : 6,
      ),
      createdAt: new Date().toISOString(),
    };
    // const eventData = {
    //   totalAmount: formatTokenAmount(totalAmount, tokenType === "IDRX" ? 2 : 6),
    //   recipients: recipients,
    //   vestingEnabled: escrowData.vestingEnabled || false,
    //   vestingDuration: escrowData.vestingDuration || 0,
    //   recipientsCount: recipients.length,
    //   averageAmount: formatTokenAmount(
    //     totalAmount / BigInt(recipients.length),
    //     tokenType === "IDRX" ? 2 : 6,
    //   ),
    //   createdAt: new Date().toISOString(),
    // };

    console.log(`✅ Escrow created successfully onchain`);
    console.log(`🔍 Transaction hash: ${hash}`);
    console.log(`🔍 Escrow ID: ${escrowId}`);

    return {
      success: true,
      transactionHash: hash,
      escrowId: escrowId,
    };
  } catch (error) {
    console.error("❌ Error creating escrow:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

// export const createEscrowOnchain = async (
//   walletClient: any,
//   tokenType: string,
//   escrowData: any,
//   userId?: string
// ) => {
//   try {
//     console.log("🔄 Creating escrow onchain:", {
//       tokenType,
//       escrowData: {
//         ...escrowData,
//         amounts: escrowData.amounts.map((a: bigint) => a.toString()),
//         totalAmount: escrowData.totalAmount.toString()
//       }
//     });

//     // Get the correct contract and token address
//     let contract, tokenAddress;
//     if (tokenType === "IDRX") {
//       contract = escrowIdrxContract;
//       tokenAddress = getTokenAddress("IDRX")
//     } else if (tokenType === "USDT") {
//       contract = escrowContract;
//       tokenAddress = getTokenAddress("USDT")
//     } else {
//       contract = escrowContract;
//       tokenAddress = getTokenAddress("USDC")
//     }

//     if (!contract || !tokenAddress) {
//       throw new Error(`Contract or token address not found for ${tokenType}`);
//     }

//     console.log("📋 Using contract:", {
//       contractAddress: contract.address,
//       tokenAddress,
//       tokenType
//     });

//     // Write transaction
//     const hash = await walletClient.writeContract({
//       address: contract.address,
//       abi: contract.abi,
//       functionName: 'createEscrow',
//       args: [
//         escrowData.receivers,
//         escrowData.amounts,
//         escrowData.totalAmount,
//         escrowData.vestingEnabled || false,
//         BigInt(escrowData.vestingDuration || 0)
//       ],
//     });

//     console.log("✅ Create escrow transaction sent:", hash);

//     // Fix: Use walletClient.waitForTransactionReceipt
//     const receipt = await publicClient.waitForTransactionReceipt({
//       hash,
//     });

//     console.log("✅ Create escrow transaction confirmed:", receipt);

//     // Extract escrowId from transaction logs
//     let escrowId = null;
//     if (receipt.logs && receipt.logs.length > 0) {
//       // Look for EscrowCreated event log
//       const escrowCreatedLog = receipt.logs.find((log: any) =>
//         log.topics && log.topics.length > 1
//       );
//       if (escrowCreatedLog && escrowCreatedLog.topics[1]) {
//         escrowId = escrowCreatedLog.topics[1];
//       }
//     }

//     return {
//       success: true,
//       transactionHash: hash,
//       escrowId: escrowId,
//       receipt
//     };

//   } catch (error) {
//     console.error("❌ Error creating escrow:", error);
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : "Unknown error"
//     };
//   }
// };

// export async function addReceiver(
//   walletClient: any,
//   tokenType: "USDC" | "USDT" | "IDRX",
//   escrowId: string,
//   receiverAddress: `0x${string}`,
//   amount: bigint,
// ): Promise<AddReceiverResult> {
//   try {
//     console.log("Adding receiver to escrow:", {
//       tokenType,
//       escrowId,
//       receiverAddress,
//       amount: amount.toString(),
//     });

//     const contractAddress =
//       tokenType === "IDRX" ? escrowIdrxContract : escrowContract;

//     const txHash = await walletClient.writeContract({
//       address: contractAddress.address,
//       abi: tokenType === "IDRX" ? escrowIdrxAbis : escrowAbis,
//       functionName: "addReceiver",
//       args: [escrowId, receiverAddress, amount],
//     });

//     console.log("Add receiver transaction sent: ", txHash);

//     const receipt = await walletClient.waitForTransactionReceipt(txHash);

//     if (receipt.status == "success") {
//       console.log("Receiver added successfully:", receipt);

//       // Receiver added successfully onchain
//       console.log(`✅ Receiver added successfully to escrow ${escrowId}`);

//       return {
//         success: true,
//         transactionHash: txHash,
//       };
//     } else {
//       return {
//         success: false,
//         error: "Transaction failed",
//       };
//     }
//   } catch (error) {
//     console.error("Error adding receiver to escrow:", error);
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : "Unknown error occured",
//     };
//   }
// }

export const addReceiver = async (
  walletClient: any,
  tokenType: string,
  escrowId: `0x${string}`,
  receiverAddress: `0x${string}`,
  amount: bigint,
) => {
  try {
    console.log("🔄 Adding receiver to escrow:", {
      tokenType,
      escrowId,
      receiverAddress,
      amount: amount.toString(),
    });

    // Get the correct contract based on token type
    let contract;
    if (tokenType === "IDRX") {
      contract = escrowIdrxContract;
    } else {
      contract = escrowContract; // USDC and USDT use same contract
    }

    if (!contract) {
      throw new Error(`Contract not found for token type: ${tokenType}`);
    }

    // Write transaction
    const hash = await walletClient.writeContract({
      address: contract.address,
      abi: contract.abi,
      functionName: "addReceiver",
      args: [escrowId, receiverAddress, amount],
    });

    console.log("✅ Add receiver transaction sent:", hash);

    // Fix: Use walletClient.waitForTransactionReceipt instead of publicClient
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
    });

    console.log("✅ Add receiver transaction confirmed:", receipt);

    return {
      success: true,
      transactionHash: hash,
      receipt,
    };
  } catch (error) {
    console.error("❌ Error adding receiver:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

// Topup funds to escrow
export const topUpFunds = async (
  walletClient: any,
  escrowId: string,
  amount: bigint,
  tokenType: TokenType,
  // tokenType: "USDC" | "USDT" | "IDRX",
): Promise<{ success: boolean; transactionHash?: string; error?: string }> => {
  try {
    let contract;
    if (tokenType === "IDRX_BASE" || tokenType === "IDRX_KAIA") {
      contract = escrowIdrxContract;
    } else {
      contract = escrowContract; // For USDC and USDT
    }
    // if (tokenType === "IDRX") {
    //   contract = escrowIdrxContract;
    // } else {
    //   contract = escrowContract; // For USDC and USDT
    // }

    console.log("🔍 topUpFunds debug:", {
      escrowId,
      amount: amount.toString(),
      tokenType,
      contractAddress: contract.address,
    });

    // First, let's check if the escrow exists and validate its state
    try {
      const escrowDetails = await contract.read.getEscrowDetails([
        escrowId as `0x${string}`,
      ]);
      console.log("🔍 Escrow details:", escrowDetails);

      // Check if escrow exists (first element should not be zero address)
      if (escrowDetails[0] === "0x0000000000000000000000000000000000000000") {
        throw new Error("Escrow not found or invalid escrow ID");
      }

      // Check if escrow is active
      const isActive = escrowDetails[9]; // isActive is at index 9
      if (!isActive) {
        throw new Error("Escrow is not active");
      }

      // Check if user has enough token balance
      const tokenAddress = getTokenAddress(tokenType);
      const userBalance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: [
          {
            inputs: [
              { internalType: "address", name: "account", type: "address" },
            ],
            name: "balanceOf",
            outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
            stateMutability: "view",
            type: "function",
          },
        ],
        functionName: "balanceOf",
        args: [walletClient.account.address],
      });

      console.log("🔍 User token balance:", userBalance.toString());
      console.log("🔍 Required amount:", amount.toString());

      if (userBalance < amount) {
        throw new Error(
          `Insufficient token balance. Required: ${amount.toString()}, Available: ${userBalance.toString()}`,
        );
      }

      // Check allowance - use escrow contract address as spender
      const allowance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: [
          {
            inputs: [
              { internalType: "address", name: "owner", type: "address" },
              { internalType: "address", name: "spender", type: "address" },
            ],
            name: "allowance",
            outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
            stateMutability: "view",
            type: "function",
          },
        ],
        functionName: "allowance",
        args: [walletClient.account.address, contract.address],
      });

      console.log("🔍 Current allowance:", allowance.toString());

      if (allowance < amount) {
        throw new Error(
          `Insufficient allowance. Required: ${amount.toString()}, Available: ${allowance.toString()}`,
        );
      }
    } catch (error) {
      console.error("❌ Error validating escrow and balance:", error);
      throw error;
    }

    // Use the full escrow ABI for better error handling
    const { request } = await contract.simulate.topUpFunds(
      [escrowId as `0x${string}`, amount],
      {
        account: walletClient.account.address,
      },
    );
    console.log("✅ Simulation successful, proceeding with transaction");

    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // Save topup funds event for tracking
    await saveEscrowEventWithContext(
      "TOPUP_FUNDS",
      escrowId,
      hash,
      walletClient.account.address,
      tokenType,
      {
        topupAmount: formatTokenAmount(
          amount,
          tokenType === "IDRX_KAIA" || tokenType === "IDRX_BASE" ? 18 : 6,
        ),
        // topupAmount: formatTokenAmount(amount, tokenType === "IDRX" ? 2 : 6),
      },
      receipt,
      contract.address,
    );

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

// Update recipient amount in escrow
export const updateRecipientAmount = async (
  walletClient: any,
  tokenType: "USDC" | "USDT" | "IDRX",
  escrowId: string,
  receiverAddress: `0x${string}`,
  newAmount: bigint,
): Promise<{ success: boolean; transactionHash?: string; error?: string }> => {
  try {
    console.log("Updating recipient amount in escrow:", {
      tokenType,
      escrowId,
      receiverAddress,
      newAmount: newAmount.toString(),
    });

    const contractAddress =
      tokenType === "IDRX" ? escrowIdrxContract : escrowContract;

    const txHash = await walletClient.writeContract({
      address: contractAddress.address,
      abi: tokenType === "IDRX" ? escrowIdrxAbis : escrowAbis,
      functionName: "updateRecipientAmount", // Assuming this function exists
      args: [escrowId, receiverAddress, newAmount],
    });

    console.log("Update recipient amount transaction sent: ", txHash);

    const receipt = await walletClient.waitForTransactionReceipt(txHash);

    if (receipt.status == "success") {
      console.log("Recipient amount updated successfully:", receipt);

      // Save update recipient amount event for tracking
      await saveEscrowEventWithContext(
        "UPDATE_RECIPIENTS_AMOUNT",
        escrowId,
        txHash,
        walletClient.account.address,
        tokenType,
        {
          updatedRecipients: [
            {
              walletAddress: receiverAddress,
              oldAmount: "0", // We don't have the old amount here
              newAmount: formatTokenAmount(
                newAmount,
                tokenType === "IDRX" ? 2 : 6,
              ),
              fullname: "Unknown User", // Will be resolved in backend
            },
          ],
        },
        receipt,
        contractAddress.address,
      );

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
    console.error("Error updating recipient amount in escrow:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occured",
    };
  }
};

// Remove recipient from escrow
// export const removeRecipient = async (
//   walletClient: any,
//   tokenType: TokenType,
//   // tokenType: "USDC" | "USDT" | "IDRX",
//   escrowId: string,
//   receiverAddress: `0x${string}`,
// ): Promise<{ success: boolean; transactionHash?: string; error?: string }> => {
//   try {
//     console.log("Removing recipient from escrow:", {
//       tokenType,
//       escrowId,
//       receiverAddress,
//     });

//     const isCorrectNetwork = await verifyNetwork(walletClient);
//     if (!isCorrectNetwork) {
//       const walletType = detectWalletType(walletClient);
//       const expectedChain = getChainForWallet(walletType);
//       throw new Error(
//         `Please switch to ${expectedChain.name} network (Chain ID: ${expectedChain.id})`,
//       );
//     }

//     //validate wallet client
//     if (!walletClient.account || !walletClient.account.address) {
//       throw new Error(
//         "Wallet client account is not available. Please reconnect your wallet.",
//       );
//     }

//     let contract;
//     let abi;

//     // const contractAddress =
//     //   tokenType === "IDRX" ? escrowIdrxContract : escrowContract;

//     if (tokenType === "IDRX_BASE" || tokenType === "IDRX_KAIA") {
//       contract = escrowIdrxContract;
//       abi = escrowIdrxAbis;
//     } else {
//       contract = escrowContract; // For USDC and USDT
//       abi = escrowAbis;
//     }

//     if (
//       !contract.address ||
//       contract.address === "0x0000000000000000000000000000000000000000"
//     ) {
//       throw new Error(`Invalid contract address: ${contract.address}`);
//     }

//     const validatedReceiverAddress = validateAddress(receiverAddress);
//     console.log("Remove recipient parameters:", {
//       contractAddress: contract.address,
//       escrowId,
//       receiverAddress: validatedReceiverAddress,
//       sender: walletClient.account.address,
//     });

//     const { request } = await publicClient.simulateContract({
//       address: contract.address,
//       abi: abi,
//       functionName: "removeReceiver",
//       args: [
//         escrowId as `0x${string}`,
//         validatedReceiverAddress as `0x${string}`,
//       ],
//       account: walletClient.account.address,
//     });
//     console.log("Simulation successful");

//     const txHash = await walletClient.writeContract(request);
//     // const txHash = await walletClient.writeContract({
//     //   address: contractAddress.address,
//     //   abi: tokenType === "IDRX" ? escrowIdrxAbis : escrowAbis,
//     //   functionName: "removeReceiver", // Assuming this function exists
//     //   args: [escrowId, receiverAddress],
//     // });

//     console.log("Remove recipient transaction sent: ", txHash);

//     // const receipt = await walletClient.waitForTransactionReceipt(txHash);
//     const receipt = await publicClient.waitForTransactionReceipt({
//       hash: txHash,
//     });

//     if (receipt.status == "success") {
//       console.log("Recipient removed successfully:", receipt);

//       // Save remove recipient event for tracking
//       await saveEscrowEventWithContext(
//         "REMOVE_RECIPIENTS",
//         escrowId,
//         txHash,
//         walletClient.account.address,
//         tokenType,
//         {
//           removedRecipients: [
//             {
//               walletAddress: receiverAddress,
//               amount: "0", // We don't have the amount here
//               fullname: "Unknown User", // Will be resolved in backend
//             },
//           ],
//         },
//         receipt,
//         contract.address,
//       );

//       return {
//         success: true,
//         transactionHash: txHash,
//       };
//     } else {
//       return {
//         success: false,
//         error: "Transaction failed",
//       };
//     }
//   } catch (error) {
//     console.error("Error removing recipient from escrow:", error);
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : "Unknown error occured",
//     };
//   }
// };
export const removeRecipient = async (
  walletClient: any,
  tokenType: TokenType,
  escrowId: string,
  receiverAddress: `0x${string}`,
): Promise<{ success: boolean; transactionHash?: string; error?: string }> => {
  try {
    console.log("🗑️ Removing recipient from escrow:", {
      tokenType,
      escrowId,
      receiverAddress,
    });

    // Verify network first
    const isCorrectNetwork = await verifyNetwork(walletClient);
    if (!isCorrectNetwork) {
      const walletType = detectWalletType(walletClient);
      const expectedChain = getChainForWallet(walletType);
      throw new Error(
        `Please switch to ${expectedChain.name} network (Chain ID: ${expectedChain.id})`
      );
    }

    // Validate wallet client
    if (!walletClient.account || !walletClient.account.address) {
      throw new Error(
        "Wallet client account is not available. Please reconnect your wallet.",
      );
    }

    // Get the correct contract based on token type
    let contract;
    let abi;
    if (tokenType === "IDRX_BASE" || tokenType === "IDRX_KAIA") {
      contract = escrowIdrxContract;
      abi = escrowIdrxAbis;
    } else {
      contract = escrowContract; // For USDC and USDT
      abi = escrowAbis;
    }

    // Validate contract address
    if (!contract.address || contract.address === "0x0000000000000000000000000000000000000000") {
      throw new Error(`Invalid contract address: ${contract.address}`);
    }

    // Validate receiver address
    const validatedReceiverAddress = validateAddress(receiverAddress);

    // Format escrow ID properly as bytes32
    let formattedEscrowId = escrowId;
    if (!escrowId.startsWith("0x")) {
      formattedEscrowId = "0x" + escrowId;
    }
    
    // Pad to 32 bytes (64 hex characters + 0x prefix = 66 characters)
    if (formattedEscrowId.length < 66) {
      formattedEscrowId = formattedEscrowId.padEnd(66, "0");
    }

    console.log("📋 Remove recipient parameters:", {
      contractAddress: contract.address,
      originalEscrowId: escrowId,
      formattedEscrowId,
      receiverAddress: validatedReceiverAddress,
      sender: walletClient.account.address,
    });

    // STEP 1: Verify the escrow exists and get its details
    console.log("🔍 Step 1: Verifying escrow exists...");
    try {
      const escrowDetails = await publicClient.readContract({
        address: contract.address,
        abi: abi,
        functionName: "getEscrowDetails",
        args: [formattedEscrowId as `0x${string}`],
      });

      console.log("✅ Escrow details found:", escrowDetails);

      // Check if escrow exists (sender should not be zero address)
      if (escrowDetails[0] === "0x0000000000000000000000000000000000000000") {
        throw new Error(`Escrow with ID ${escrowId} does not exist`);
      }

      // Check if the current user is the sender
      if (escrowDetails[0].toLowerCase() !== walletClient.account.address.toLowerCase()) {
        throw new Error("Only the escrow sender can remove receivers");
      }

      console.log("✅ Escrow validation passed");
    } catch (error) {
      console.error("❌ Escrow validation failed:", error);
      throw new Error(`Escrow validation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    // STEP 2: Get all receivers in the escrow to verify the receiver exists
    console.log("🔍 Step 2: Checking if receiver exists in escrow...");
    try {
      const escrowReceivers = await publicClient.readContract({
        address: contract.address,
        abi: abi,
        functionName: "getEscrowReceivers",
        args: [formattedEscrowId as `0x${string}`],
      });

      console.log("📋 Current receivers in escrow:", escrowReceivers);

      // Check if the receiver exists in the escrow
      const receiverExists = (escrowReceivers as string[]).some(
        (addr: string) => addr.toLowerCase() === validatedReceiverAddress.toLowerCase()
      );

      if (!receiverExists) {
        throw new Error(
          `Receiver ${validatedReceiverAddress} does not exist in escrow ${escrowId}. ` +
          `Current receivers: ${(escrowReceivers as string[]).join(", ")}`
        );
      }

      console.log("✅ Receiver found in escrow");
    } catch (error) {
      console.error("❌ Receiver verification failed:", error);
      throw new Error(`Receiver verification failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    // STEP 3: Get receiver details to confirm it's active
    console.log("🔍 Step 3: Getting receiver details...");
    try {
      const receiverDetails = await publicClient.readContract({
        address: contract.address,
        abi: abi,
        functionName: "getReceiverDetails",
        args: [formattedEscrowId as `0x${string}`, validatedReceiverAddress as `0x${string}`],
      });

      console.log("📋 Receiver details:", receiverDetails);

      // Check if receiver is active (index 2 should be true for active receivers)
      if (!receiverDetails[2]) {
        throw new Error(`Receiver ${validatedReceiverAddress} is already inactive in escrow ${escrowId}`);
      }

      console.log("✅ Receiver is active and can be removed");
    } catch (error) {
      console.error("❌ Receiver details check failed:", error);
      throw new Error(`Receiver details check failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    // STEP 4: Simulate the transaction
    console.log("🔍 Step 4: Simulating removeReceiver transaction...");
    const { request } = await publicClient.simulateContract({
      address: contract.address,
      abi: abi,
      functionName: "removeReceiver",
      args: [formattedEscrowId as `0x${string}`, validatedReceiverAddress as `0x${string}`],
      account: walletClient.account.address,
    });

    console.log("✅ Remove recipient simulation successful");

    // STEP 5: Execute the transaction
    console.log("🔍 Step 5: Executing transaction...");
    const hash = await walletClient.writeContract(request);
    console.log("📝 Remove recipient transaction submitted:", hash);

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("✅ Remove recipient transaction confirmed:", receipt);

    // Save event for tracking
    await saveEscrowEventWithContext(
      "REMOVE_RECIPIENTS",
      escrowId,
      hash,
      walletClient.account.address,
      tokenType,
      {
        removedReceiver: validatedReceiverAddress,
        escrowId: formattedEscrowId,
        contractAddress: contract.address,
      },
      receipt,
      contract.address
    );

    console.log("✅ Recipient removed successfully from blockchain");

    return {
      success: true,
      transactionHash: hash,
    };
  } catch (error) {
    console.error("❌ Error removing recipient:", error);
    
    let errorMessage = "Unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    }

    // Handle specific error cases
    if (errorMessage.includes("User rejected")) {
      errorMessage = "Transaction was rejected by user";
    } else if (errorMessage.includes("insufficient funds")) {
      errorMessage = "Insufficient funds to pay for transaction";
    } else if (errorMessage.includes("execution reverted")) {
      if (errorMessage.includes("Receiver does not exist")) {
        errorMessage = "Receiver not found in escrow. They may have been removed already or never added to this escrow.";
      } else {
        errorMessage = "Transaction failed: " + errorMessage;
      }
    } else if (errorMessage.includes("does not exist in escrow")) {
      // Our custom error message
      errorMessage = errorMessage;
    }

    return {
      success: false,
      error: errorMessage,
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
      abi: escrowAbis,
      functionName: "withdrawTokenToFiat",
      args: [escrowId, amount, depositWalletAddress],
    });

    // Tunggu receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === "success") {
      console.log("✅ Withdraw successful:", receipt);

      // Save withdraw funds event for tracking
      await saveEscrowEventWithContext(
        "WITHDRAW_FUNDS",
        escrowId,
        hash,
        walletClient.account.address,
        "USDC", // This function is specifically for USDC
        {
          withdrawAmount: formatTokenAmount(amount, 6), // USDC has 6 decimals
          withdrawTo: depositWalletAddress,
        },
        receipt,
        getEscrowAddress("USDC"),
      );

      // Query and save tokenWithdrawToFiat data to database after successful withdrawal
      try {
        console.log(
          "💾 Triggering tokenWithdrawToFiat data save for receiver:",
          walletClient.account.address,
        );

        // Import the function dynamically to avoid circular imports
        const { saveTokenWithdrawToFiatToDatabase } = await import(
          "../app/api/api"
        );
        await saveTokenWithdrawToFiatToDatabase(walletClient.account.address);

        console.log(
          "✅ TokenWithdrawToFiat data saved to database successfully",
        );
      } catch (dbError) {
        // Don't fail the whole transaction if database save fails
        console.warn(
          "⚠️ Failed to save tokenWithdrawToFiat to database:",
          dbError,
        );
      }

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

// Withdraw USDC to Crypto (receiver's own wallet)
export const withdrawUSDCToCrypto = async (
  walletClient: any,
  escrowId: string,
  amount: bigint,
): Promise<{ success: boolean; transactionHash?: string; error?: string }> => {
  try {
    // Send transaction
    const hash = await walletClient.writeContract({
      address: getEscrowAddress("USDC"),
      abi: escrowAbis,
      functionName: "withdrawTokenToCrypto",
      args: [escrowId, amount],
    });

    // Wait for receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === "success") {
      console.log("✅ Withdraw to crypto successful:", receipt);

      // Save withdraw funds event for tracking
      await saveEscrowEventWithContext(
        "WITHDRAW_FUNDS",
        escrowId,
        hash,
        walletClient.account.address,
        "USDC", // This function is specifically for USDC
        {
          withdrawAmount: formatTokenAmount(amount, 6), // USDC has 6 decimals
          withdrawTo: walletClient.account.address, // Receiver's own wallet
        },
        receipt,
        getEscrowAddress("USDC"),
      );

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
    console.error("❌ Error withdrawing USDC to crypto:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

// Withdraw IDRX to Crypto (receiver's own wallet)
export const withdrawIDRXToCrypto = async (
  walletClient: any,
  escrowId: string,
  amount: bigint,
): Promise<{ success: boolean; transactionHash?: string; error?: string }> => {
  try {
    // Send transaction
    const hash = await walletClient.writeContract({
      address: getEscrowAddress("IDRX_BASE"),
      // address: getEscrowAddress("IDRX"),
      abi: escrowIdrxAbis,
      functionName: "withdrawIDRXToCrypto",
      args: [escrowId, amount],
    });

    // Wait for receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === "success") {
      console.log("✅ Withdraw IDRX to crypto successful:", receipt);

      // Save withdraw funds event for tracking
      await saveEscrowEventWithContext(
        "WITHDRAW_FUNDS",
        escrowId,
        hash,
        walletClient.account.address,
        "IDRX", // This function is specifically for IDRX
        {
          withdrawAmount: formatTokenAmount(amount, 2), // IDRX has 2 decimals
          withdrawTo: walletClient.account.address, // Receiver's own wallet
        },
        receipt,
        getEscrowAddress("IDRX_BASE"),
        // getEscrowAddress("IDRX"),
      );

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
    console.error("❌ Error withdrawing IDRX to crypto:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
