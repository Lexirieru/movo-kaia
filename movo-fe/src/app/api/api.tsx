import { GroupOfUser } from "@/types/receiverInGroupTemplate";
import axios, { AxiosError } from "axios";
import { getTokenType } from "@/lib/tokenMapping";
import { createPublicClient, http, parseAbi } from "viem";
import { kaiaMainnet } from "@/lib/smartContract";
import { getDefaultChain } from "@/lib/addresses/chainAddress";
import { escrowAbis } from "@/lib/abis/escrowAbis";
import { escrowIdrxAbis } from "@/lib/abis/escrowIdrxAbis";
import { getEscrowAddress } from "@/lib/contractConfig";
interface ErrorResponse {
  message?: string;
}
// Goldsky API URLs for Kaia mainnet escrow contracts
const GOLDSKY_ESCROW_API_URL = process.env.NEXT_PUBLIC_GOLDSKY_ESCROW_API_URL || 
  "https://api.goldsky.com/api/public/project_cmfnod75l9o1r01xy81lz52hq/subgraphs/MovoUSDCEscrowKaiaMainnet/1.0.0/gn";
const GOLDSKY_ESCROW_IDRX_API_URL = process.env.NEXT_PUBLIC_GOLDSKY_ESCROW_IDRX_API_URL ||
  "https://api.goldsky.com/api/public/project_cmfnod75l9o1r01xy81lz52hq/subgraphs/MovoIDRXEscrowKaiaMainnet/1.0.0/gn";

// Simple in-memory cache for API responses
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds cache

// Cache helper functions
const getCachedData = (key: string) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log("📦 Using cached data for:", key);
    return cached.data;
  }
  return null;
};

const setCachedData = (key: string, data: any) => {
  cache.set(key, { data, timestamp: Date.now() });
  console.log("💾 Cached data for:", key);
};

// Token configuration untuk decimals (terpusat untuk maintenance)
export const TOKEN_DECIMALS_CONFIG = {
  USDC: 6,
  USDT: 6,
  IDRX: 6,
} as const;

export type TokenType = keyof typeof TOKEN_DECIMALS_CONFIG;

// Helper function untuk mendapatkan decimals berdasarkan token type
export const getTokenDecimals = (tokenType: TokenType): number => {
  return TOKEN_DECIMALS_CONFIG[tokenType];
};

// Clear cache for specific address or all cache
export const clearCache = (address?: string) => {
  if (address) {
    const senderKey = `sender_${address.toLowerCase()}`;
    const receiverKey = `receiver_${address.toLowerCase()}`;
    const receiverSimpleKey = `receiver_simple_${address.toLowerCase()}`;
    cache.delete(senderKey);
    cache.delete(receiverKey);
    cache.delete(receiverSimpleKey);
    console.log("🗑️ Cleared cache for address:", address);
  } else {
    cache.clear();
    console.log("🗑️ Cleared all cache");
  }
};

// Function to clear cache when escrow is created
export const clearCacheOnEscrowCreated = (walletAddress: string) => {
  clearCache(walletAddress);
  // Also clear contract details cache
  contractDetailsCache.clear();
  console.log("🔄 Cache cleared due to new escrow creation");
};

// Function to clear contract details cache
export const clearContractCache = () => {
  contractDetailsCache.clear();
  console.log("🗑️ Contract details cache cleared");
};

// Function to clear cache after topup
export const clearCacheAfterTopup = (escrowId: string, walletAddress: string) => {
  // Clear general cache
  clearCache(walletAddress);
  
  // Clear contract details cache for this specific escrow
  const contractAddresses = [
    "0x0d837aD954F4f9F06E303A86150ad0F322Ec5EB1", // USDC/USDT escrow
    "0x4ce1D1E0e9C769221E03e661abBf043cceD84F1f", // IDRX escrow
  ];
  
  contractAddresses.forEach(contractAddress => {
    const cacheKey = `${contractAddress}-${escrowId}`;
    contractDetailsCache.delete(cacheKey);
  });
  
  console.log("🔄 Cache cleared after topup for escrow:", escrowId);
};

// Function to calculate accurate availableAmount using Goldsky fundsTopUps data
const calculateAvailableAmountFromTopups = async (
  escrowId: string,
  receiverAddress: string,
  tokenType: string
): Promise<{ availableAmount: string; totalTopups: string; canClaim: boolean }> => {
  try {
    console.log("💰 Calculating availableAmount from topups for escrow:", escrowId);
    console.log("💰 Receiver address:", receiverAddress);
    console.log("💰 Token type:", tokenType);
    
    // Query Goldsky for fundsTopUps for this specific escrow
    const query = `
      query GetTopupsForEscrow($escrowId: String!) {
        fundsTopUps(where: { escrowId: $escrowId }) {
          amount
          sender
          escrowId
          newCycleBalance
          tokenAddress
          block_number
          timestamp_
        }
      }
    `;

    console.log("🔍 Querying Goldsky with escrowId:", escrowId);
    const response = await axios.post(GOLDSKY_ESCROW_API_URL, {
      query,
      variables: { escrowId },
    });

    console.log("🔍 Goldsky response:", response.data);
    const topups = response.data.data.fundsTopUps || [];
    console.log("📊 Topups found for escrow:", topups.length);
    console.log("📊 Topups data:", topups);

    // Calculate total topup amount
    const totalTopups = topups.reduce((sum: bigint, topup: any) => {
      return sum + BigInt(topup.amount || "0");
    }, BigInt(0));

    console.log("💰 Total topups amount:", totalTopups.toString());

    // If no topups found, return zero
    if (totalTopups === BigInt(0)) {
      console.log("❌ No topups found for escrow:", escrowId);
      return { availableAmount: "0", totalTopups: "0", canClaim: false };
    }

    // Get receiver's allocated amount from smart contract
    const contractAddress = tokenType === "IDRX" 
      ? "0x4ce1D1E0e9C769221E03e661abBf043cceD84F1f" 
      : "0x0d837aD954F4f9F06E303A86150ad0F322Ec5EB1";
    
    console.log("🔍 Getting contract details from:", contractAddress);
    const contractDetails = await getEscrowDetailsFromContract(escrowId, contractAddress);
    if (!contractDetails) {
      console.log("❌ Could not get contract details for escrow:", escrowId);
      return { availableAmount: "0", totalTopups: totalTopups.toString(), canClaim: false };
    }

    console.log("🔍 Contract details:", contractDetails);

    // Find receiver's allocated amount
    const receiverIndex = contractDetails.receiverAddresses.findIndex(
      (addr: string) => addr.toLowerCase() === receiverAddress.toLowerCase()
    );

    if (receiverIndex === -1) {
      console.log("❌ Receiver not found in escrow");
      return { availableAmount: "0", totalTopups: totalTopups.toString(), canClaim: false };
    }

    // Get receiver's allocated amount (simplified approach)
    const receiverAllocatedAmount = BigInt(contractDetails.totalAllocatedAmount) / BigInt(contractDetails.receiverCount);
    
    console.log("📊 Receiver allocated amount:", receiverAllocatedAmount.toString());
    console.log("📊 Total topups:", totalTopups.toString());

    // Calculate available amount: min(totalTopups, receiverAllocatedAmount)
    const availableAmount = totalTopups < receiverAllocatedAmount ? totalTopups : receiverAllocatedAmount;
    const canClaim = totalTopups >= receiverAllocatedAmount;

    console.log("✅ Calculated availableAmount:", {
      availableAmount: availableAmount.toString(),
      totalTopups: totalTopups.toString(),
      receiverAllocatedAmount: receiverAllocatedAmount.toString(),
      canClaim
    });

    return {
      availableAmount: availableAmount.toString(),
      totalTopups: totalTopups.toString(),
      canClaim
    };

  } catch (error) {
    console.error("❌ Error calculating availableAmount from topups:", error);
    return { availableAmount: "0", totalTopups: "0", canClaim: false };
  }
};

// Check if URLs are properly defined
if (!GOLDSKY_ESCROW_API_URL) {
  console.error("❌ GOLDSKY_ESCROW_API_URL is not defined!");
}
if (!GOLDSKY_ESCROW_IDRX_API_URL) {
  console.error("❌ GOLDSKY_ESCROW_IDRX_API_URL is not defined!");
}

// Viem client configuration
const publicClient = createPublicClient({
  chain: kaiaMainnet,
  transport: http(),
});

// Escrow contract ABI for getEscrowDetails
const escrowContractABI = parseAbi([
  "function getEscrowDetails(bytes32 _escrowId) view returns (address sender, address tokenAddress, uint256 totalAllocatedAmount, uint256 totalDepositedAmount, uint256 totalWithdrawnAmount, uint256 availableBalance, uint256 createdAt, uint256 lastTopUpAt, uint256 receiverCount, uint256 activeReceiverCount, address[] receiverAddresses)",
]);

// Cache for contract details to avoid repeated calls
const contractDetailsCache = new Map<string, any>();

// Function to read escrow details from smart contract
const getEscrowDetailsFromContract = async (
  escrowId: string,
  contractAddress: string,
) => {
  try {
    const cacheKey = `${contractAddress}-${escrowId}`;

    // Check cache first
    if (contractDetailsCache.has(cacheKey)) {
      console.log("📦 Using cached contract details for:", cacheKey);
      return contractDetailsCache.get(cacheKey);
    }

    console.log("📋 Reading escrow details from contract:", {
      escrowId,
      contractAddress,
    });

    const result = await publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi: escrowContractABI,
      functionName: "getEscrowDetails",
      args: [escrowId as `0x${string}`],
    });

    console.log("✅ Escrow details from contract:", result);

    const contractDetails = {
      sender: result[0],
      tokenAddress: result[1],
      totalAllocatedAmount: result[2].toString(),
      totalDepositedAmount: result[3].toString(),
      totalWithdrawnAmount: result[4].toString(),
      availableBalance: result[5].toString(),
      createdAt: result[6].toString(),
      lastTopUpAt: result[7].toString(),
      receiverCount: result[8].toString(),
      activeReceiverCount: result[9].toString(),
      receiverAddresses: result[10],
    };

    // Cache the result for 5 minutes
    contractDetailsCache.set(cacheKey, contractDetails);
    setTimeout(
      () => {
        contractDetailsCache.delete(cacheKey);
      },
      5 * 60 * 1000,
    ); // 5 minutes

    return contractDetails;
  } catch (error) {
    console.error("❌ Error reading escrow details from contract:", error);
    return null;
  }
};

export const getEscrowDetailsWithTokenDetection = async (escrowId: string) => {
  try {
    console.log("Getting escrow details with doken detection for:", escrowId);

    const goldskyDetails = await fetchEscrowDetailsFromGoldsky(escrowId);

    let tokenType: "USDC" | "USDT" | "IDRX" = "USDC"; // Default to USDC
    let contractAddress: string;

    if (goldskyDetails && goldskyDetails.contractId_) {
      tokenType = determineTokenTypeFromContract(goldskyDetails.contractId_);
      contractAddress = getContractAddressByTokenType(tokenType);
      console.log("Token type detected");
    } else {
      console.log(
        "Token type could not be determined from Goldsky, defaulting to USDC",
      );

      const tokenTypes: ("USDC" | "USDT" | "IDRX")[] = ["USDC", "USDT", "IDRX"];
      for (const type of tokenTypes) {
        try {
          const testContractAddress = getContractAddressByTokenType(type);
          const contractDetails = await getEscrowDetailsFromContract(
            escrowId,
            testContractAddress,
          );

          if (
            contractDetails &&
            contractDetails.sender &&
            contractDetails.sender !==
              "0x0000000000000000000000000000000000000000"
          ) {
            tokenType = type;
            contractAddress = testContractAddress;
            console.log(`Token type determined by contract read: ${tokenType}`);
            break;
          }
        } catch (error) {
          console.error(
            "Error determining token type by contract read:",
            error,
          );
          continue;
        }
      }
      // if (!found) {
      //   contractAddress = getContractAddressByTokenType("USDC");
      //   console.log("⚠️ Could not detect token type, defaulting to USDC");
      // }
    }

    const contractDetails = await getEscrowDetailsFromContract(
      escrowId,
      contractAddress,
    );
    if (!contractDetails) {
      throw new Error("Could not fetch contract details");
    }

    const enhancedDetails = {
      // Basic escrow info
      escrowId: escrowId,
      tokenType: tokenType,
      contractAddress: contractAddress,

      // From contract
      creator: contractDetails.sender,
      tokenAddress: contractDetails.tokenAddress,
      totalAllocatedAmount: contractDetails.totalAllocatedAmount,
      totalDepositedAmount: contractDetails.totalDepositedAmount,
      totalWithdrawnAmount: contractDetails.totalWithdrawnAmount,
      availableBalance: contractDetails.availableBalance,
      createdAt: contractDetails.createdAt,
      lastTopUpAt: contractDetails.lastTopUpAt,
      receiverCount: contractDetails.receiverCount,
      activeReceiverCount: contractDetails.activeReceiverCount,
      receiverAddresses: contractDetails.receiverAddresses,

      // From Goldsky (if available)
      goldskyData: goldskyDetails,

      // Computed fields
      isActive: parseFloat(contractDetails.availableBalance) > 0,
      remainingAmount: contractDetails.availableBalance,

      // Receivers with detailed info
      receivers: contractDetails.receiverAddresses.map(
        (addr: string, index: number) => ({
          address: addr,
          allocation: "0", // Will be filled from Goldsky data if available
          withdrawn: "0", // Will be calculated
          remaining: "0", // Will be calculated
        }),
      ),
    };

    if (goldskyDetails) {
      const receivers = goldskyDetails.receivers
        ? goldskyDetails.receivers.split(",")
        : [];
      const amounts = goldskyDetails.amounts
        ? goldskyDetails.amounts.split(",")
        : [];

      enhancedDetails.receivers = receivers.map(
        (addr: string, index: number) => ({
          address: addr.trim(),
          allocation: amounts[index]?.trim() || "0",
          withdrawn: "0", // TODO: Get from withdraw events
          remaining: amounts[index]?.trim() || "0", // TODO: Calculate actual remaining
        }),
      );
    }

    console.log("✅ Enhanced escrow details:", enhancedDetails);
    return enhancedDetails;
  } catch (err) {
    console.error("Error in getEscrowDetailsWithTokenDetection:", err);
    throw err;
  }
};

export const fetchEscrowDetailsFromGoldsky = async (escrowId: string) => {
  try {
    const query = `
      query GetEscrowDetails($escrowId: String!) {
        escrowCreateds(where: { escrowId: $escrowId }) {
          escrowId
          sender
          receivers
          amounts
          totalAmount
          timestamp_
          transactionHash_
          contractId_
          tokenAddress
        }
      }
    `;

    const response = await axios.post(GOLDSKY_ESCROW_API_URL, {
      query,
      variables: { escrowId },
    });

    if (response.data.errors) {
      console.error("❌ GraphQL errors:", response.data.errors);
      return null;
    }

    const escrows = response.data.data.escrowCreateds;
    if (escrows && escrows.length > 0) {
      return escrows[0];
    }

    console.log("⚠️ No escrow found in Goldsky for ID:", escrowId);
    return null;
  } catch (error) {
    console.error("❌ Error fetching escrow details from Goldsky:", error);
    return null;
  }
};

// Function to get contract address based on token type
const getContractAddressByTokenType = (tokenType: string): string => {
  const tokenTypeLower = tokenType.toLowerCase();
  const chain = getDefaultChain();

  if (tokenTypeLower === "idrx") {
    return chain.contracts.escrowIdrx;
  } else if (tokenTypeLower === "usdt") {
    return chain.contracts.escrow; // USDT uses same escrow contract as USDC
  } else {
    // Default to USDC
    return chain.contracts.escrow;
  }
};

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,
});

// Function to trigger backend to fetch and save tokenWithdrawToFiat data
export const saveTokenWithdrawToFiatToDatabase = async (receiver: string) => {
  try {
    console.log(
      "💾 Saving tokenWithdrawToFiat to database for receiver:",
      receiver,
    );

    const response = await api.post("/tokenWithdrawToFiat/fetch", {
      receiver,
    });

    console.log("✅ TokenWithdrawToFiat saved to database:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error saving tokenWithdrawToFiat to database:", error);
    throw error;
  }
};

// Function to get tokenWithdrawToFiat history from database
export const getTokenWithdrawToFiatHistory = async (receiver: string) => {
  try {
    console.log(
      "📚 Getting tokenWithdrawToFiat history for receiver:",
      receiver,
    );

    const response = await api.get(`/tokenWithdrawToFiat/history/${receiver}`);

    console.log("✅ TokenWithdrawToFiat history fetched:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error getting tokenWithdrawToFiat history:", error);
    throw error;
  }
};

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ErrorResponse>) => {
    if (error.code === "ECONNABORTED") {
      return Promise.reject({ message: "Request timeout" });
    }
    return Promise.reject(error.response?.data || { message: "Unknown error" });
  },
);

export const register = async (
  email: string,
  fullname: string,
  password: string,
  walletAddress: string,
) => {
  try {
    const response = await api.post("/onBoardingUser", {
      email,
      fullname,
      password,
      walletAddress,
    });
    return response.data;
  } catch (err) {
    console.log(err);
  }
};

export const loginWithWallet = async (walletAddress: string) => {
  try {
    console.log("🔐 Attempting to login with wallet:", walletAddress);
    const response = await api.post("/loginWithWallet", { walletAddress });
    console.log("✅ Login API response:", response.data);
    return response.data;
  } catch (err: any) {
    console.error("❌ Login API error:", err);

    // Return error response jika ada status code dari backend
    if (err.response?.data) {
      console.log("🔄 Returning backend error response:", err.response.data);
      return err.response.data;
    }

    // Return generic error jika tidak ada response dari backend
    return {
      statusCode: 500,
      message: "Network error or server is down",
      error: true,
    };
  }
};

export const addBankAccount = async (
  _id: string,
  bankAccountNumber: string,
  bankCode: string,
) => {
  try {
    const response = await api.post("/addBankAccount", {
      _id,
      bankAccountNumber,
      bankCode,
    });
    return response.data;
  } catch (err) {
    console.log(err);
  }
};

// ngesync walletAddress ke sebuah akun
export const addWalletAddress = async (
  email: string,
  password: string,
  walletAddress: string,
) => {
  try {
    const response = await api.post("/addWalletAddress", {
      email,
      password,
      walletAddress,
    });
    return response.data;
  } catch (err) {
    console.log(err);
  }
};

export const updateWalletAddressRole = async (
  _id: string,
  walletAddress: string,
  role: string,
) => {
  try {
    const response = await api.post("/updateWalletAddressRole", {
      _id,
      walletAddress,
      role,
    });
    return response.data;
  } catch (err) {
    console.error("Error updating wallet address role:", err);
  }
};

export const getBankAccount = async (_id: string) => {
  try {
    const response = await api.post("/getBankAccount", { _id });
    return response.data;
  } catch (err) {
    console.log(err);
  }
};

export const getBankAccountFromDatabase = async (_id: string) => {
  try {
    const response = await api.post("/getBankAccountFromDatabase", { _id });
    console.log(response.data.data);
    return response.data.data;
  } catch (err) {
    console.log(err);
  }
};

export const changeBankAccount = async (
  _id: string,
  bankAccountNumber: string,
  bankCode: string,
) => {
  try {
    const response = await api.post("/changeBankAccount", {
      _id,
      bankAccountNumber,
      bankCode,
    });
    console.log(response);
    return response.data;
  } catch (err) {
    console.log(err);
  }
};

export const addBankAccountToDatabase = async (
  _id: string,
  bankAccountNumber: string,
  bankCode: string,
) => {
  try {
    console.log(_id);
    const response = await api.post("/addBankAccountToDatabase", {
      _id,
      bankAccountNumber,
      bankCode,
    });
    return response.data;
  } catch (err) {
    console.log(err);
  }
};

export const getEscrowId = async (_id: string, groupId: string) => {
  try {
    const response = await api.post("/getEscrowId", { _id, groupId });
    console.log(response);
    return response.data;
  } catch (err) {
    console.log(err);
  }
};

export const saveEscrowToDatabase = async (escrowData: {
  groupId: string;
  escrowId: string;
  originCurrency: "USDC" | "USDT" | "IDRX";
  walletAddress: string;
  totalAmount: string;
  receivers: Array<{
    address: string;
    amount: string;
  }>;
  transactionHash: string;
  status: string;
  createdAt: string;
}) => {
  try {
    const response = await axios.post(`/saveEscrowToDatabase`, escrowData);
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error("Error saving escrow to database:", error);
    throw error;
  }
};

// export const loadAllIncomingTransaction = async (
//   _id: string,
//   walletAddress: string,
// ) => {
//   try {
//     const response = await api.post("/loadAllIncomingTransaction", {
//       _id,
//       walletAddress,
//     });
//     return response.data.data;
//   } catch (err) {
//     console.log(err);
//   }
// };

export const loadAllWithdrawHistory = async (
  _id: string,
  walletAddress: string,
) => {
  try {
    console.log(
      "📚 Loading withdraw history from database for wallet:",
      walletAddress,
    );

    // Get tokenWithdrawToFiat history from database
    const response = await api.get(
      `/tokenWithdrawToFiat/history/${walletAddress}`,
    );

    if (response.data.success && response.data.data) {
      // Transform database data to match expected format
      const transformedData = response.data.data.map((withdraw: any) => ({
        withdrawId: withdraw.transactionHash, // Use transaction hash as withdraw ID
        receiverId: withdraw.receiver,
        amount: withdraw.amount,
        choice: "USDC_TO_FIAT", // Since this is specifically for USDC to fiat withdrawals
        originCurrency: "USDC",
        targetCurrency: "IDR",
        networkChainId: "84532", // Base Sepolia
        walletAddress: withdraw.receiver,
        depositWalletAddress: withdraw.depositWallet,
        bankId: withdraw.contractId,
        bankName: "Bank Transfer", // Default bank name
        bankAccountName: "Receiver Account",
        bankAccountNumber: withdraw.depositWallet,
        createdAt: new Date(parseInt(withdraw.timestamp) * 1000).toISOString(),
        claimedAt: new Date(parseInt(withdraw.timestamp) * 1000).toISOString(),
        transactionHash: withdraw.transactionHash,
        escrowId: withdraw.escrowId,
        blockNumber: withdraw.blockNumber,
      }));

      console.log("✅ Transformed withdraw history:", transformedData);
      return transformedData;
    }

    return [];
  } catch (err) {
    console.error("❌ Error loading withdraw history from database:", err);
    // Fallback to empty array if there's an error
    return [];
  }
};

export const loadAllGroupTransactionHistory = async (
  _id: string,
  walletAddress: string,
) => {
  try {
    const response = await api.post("/loadAllGroupTransactionHistory", {
      _id,
      walletAddress,
    });
    return response.data.data;
  } catch (err) {
    console.log(err);
  }
};

export const deleteGroup = async (_id: string, groupId: string) => {
  try {
    const response = await api.post("/deleteGroup", { _id, groupId });
    return response.data;
  } catch (err) {
    console.log(err);
  }
};

export const editReceiverAmountInGroup = async (
  senderId: string,
  groupId: string,
  receiverId: string,
  amount: string,
) => {
  try {
    const response = await api.post("/editReceiverAmountInGroup", {
      senderId,
      groupId,
      receiverId,
      amount,
    });
    console.log(response);
    return response.data;
  } catch (err) {
    console.log(err);
  }
};

export const removeReceiverDataFromGroup = async (
  receiverId: string,
  groupId: string,
  senderId: string,
) => {
  try {
    const response = await api.post("/removeReceiverDataFromGroup", {
      receiverId,
      groupId,
      senderId,
    });
    return response.data;
  } catch (err) {
    console.log(err);
  }
};

export const loadSpecifiedGroupTransactionHistory = async (
  _id: string,
  groupId: string,
  txId: string,
) => {
  try {
    const response = await api.post("/loadSpecifiedGroupTransactionHistory", {
      _id,
      groupId,
      txId,
    });
    return response.data.data;
  } catch (err) {
    console.log(err);
  }
};

export const loadSpecifiedGroup = async (
  _id: string,
  groupId: string,
): Promise<GroupOfUser | null> => {
  try {
    const response = await api.post("/loadSpecifiedGroupForSender", {
      _id,
      groupId,
    });
    return response.data.data as GroupOfUser;
  } catch (err) {
    console.log("Error loading specified group:", err);
    return null;
  }
};

export const loadAllGroup = async (_id: string, walletAddress: string) => {
  try {
    const response = await api.post("/loadAllGroup", { _id, walletAddress });
    return response.data.data;
  } catch (err) {
    console.log(err);
  }
};

export const addGroup = async (
  _id: string,
  email: string,
  groupId: string,
  nameOfGroup: string,
  walletAddress: string,
) => {
  try {
    const response = await api.post("/addGroup", {
      _id,
      email,
      groupId,
      nameOfGroup,
      walletAddress,
    });
    return response.data; // backend return { message, payroll }
  } catch (err) {
    console.log("Error adding group:", err);
    throw err;
  }
};

export const getUsdcIdrxRate = async () => {
  try {
    const response = await api.post("/getIdrxRateFromUSDC");
    return response.data;
  } catch (err) {
    console.log(err);
  }
};

export const logout = async () => {
  const response = await api.post("/logout"); // backend akan hapus cookie
  return response.data.message;
};

export const checkWalletAddressesRegistration = async (
  walletAddresses: string[],
) => {
  try {
    const response = await api.post("/checkWalletAddressesRegistration", {
      walletAddresses,
    });
    console.log(response);
    return response.data;
  } catch (error) {
    console.error("Error checking wallet addresses registration:", error);
    throw error;
  }
};

// Enhanced function to fetch comprehensive receiver events including withdrawals
export const fetchComprehensiveReceiverEvents = async (
  receiverAddress: string,
) => {
  try {
    if (!receiverAddress) {
      console.error("❌ No receiver address provided");
      return { escrowEvents: [], withdrawEvents: [] };
    }

    const cacheKey = `receiver_comprehensive_${receiverAddress.toLowerCase()}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    if (!GOLDSKY_ESCROW_API_URL) {
      console.error("❌ Goldsky API URL not defined");
      return { escrowEvents: [], withdrawEvents: [] };
    }

    // Simplified query to get all events first, then filter
    const query = `
      query GetAllReceiverEvents {
        escrowCreateds(
          orderBy: timestamp_
          orderDirection: desc
          first: 1000
        ) {
          escrowId
          sender
          receivers
          amounts
          totalAmount
          tokenAddress
          block_number
          timestamp_
          transactionHash_
          contractId_
        }
        tokenWithdrawns(
          orderBy: timestamp_
          orderDirection: desc
          first: 1000
        ) {
          escrowId
          recipient
          amount
          depositWallet
          tokenAddress
          block_number
          timestamp_
          transactionHash_
          contractId_
        }
      }
    `;

    const response = await axios.post(GOLDSKY_ESCROW_API_URL, {
      query,
    });

    if (response.data.errors) {
      console.error("❌ GraphQL errors:", response.data.errors);
      return { escrowEvents: [], withdrawEvents: [] };
    }

    const data = response.data.data;
    const allEvents = [];
    const withdrawEvents = [];
    const receiverAddressLower = receiverAddress.toLowerCase();

    // Process escrow created events (where user is a receiver)
    if (data.escrowCreateds) {
      data.escrowCreateds.forEach((event: any) => {
        // Check if the receiver address is in the receivers list
        if (event.receivers) {
          const receivers = event.receivers
            .split(",")
            .map((addr: string) => addr.trim().toLowerCase());
          if (receivers.includes(receiverAddressLower)) {
            allEvents.push({
              ...event,
              eventType: "ESCROW_CREATED",
              tokenType: determineTokenTypeFromContract(event.contractId_),
            });
          }
        }
      });
    }

    // Process withdrawal events
    if (data.tokenWithdrawns) {
      data.tokenWithdrawns.forEach((event: any) => {
        if (
          event.recipient &&
          event.recipient.toLowerCase() === receiverAddressLower
        ) {
          withdrawEvents.push({
            escrowId: event.escrowId,
            recipient: event.recipient,
            amount: event.amount,
            timestamp: new Date(parseInt(event.timestamp_) * 1000),
            transactionHash: event.transactionHash_,
            blockNumber: event.block_number,
            depositWallet: event.depositWallet,
            tokenType: determineTokenTypeFromContract(event.contractId_),
          });
        }
      });
    }

    // Sort all events by timestamp
    allEvents.sort((a, b) => parseInt(b.timestamp_) - parseInt(a.timestamp_));
    withdrawEvents.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );

    const result = { escrowEvents: allEvents, withdrawEvents };

    // Cache the result
    setCachedData(cacheKey, result);

    return result;
  } catch (error) {
    console.error("❌ Error fetching comprehensive receiver events:", error);
    return { escrowEvents: [], withdrawEvents: [] };
  }
};

// Enhanced function to fetch comprehensive escrow events including topups and other activities
export const fetchComprehensiveEscrowEvents = async (userAddress: string) => {
  try {
    if (!userAddress) {
      console.error("❌ No user address provided");
      return [];
    }

    const cacheKey = `comprehensive_${userAddress.toLowerCase()}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    if (!GOLDSKY_ESCROW_API_URL) {
      console.error("❌ Goldsky API URL not defined");
      return [];
    }

    // Simplified query to get all events first, then filter
    const query = `
      query GetAllEvents {
        escrowCreateds(
          orderBy: timestamp_
          orderDirection: desc
          first: 1000
        ) {
          escrowId
          sender
          receivers
          amounts
          totalAmount
          tokenAddress
          block_number
          timestamp_
          transactionHash_
          contractId_
        }
        fundsTopUps(
          orderBy: timestamp_
          orderDirection: desc
          first: 1000
        ) {
          escrowId
          sender
          amount
          newCycleBalance
          tokenAddress
          block_number
          timestamp_
          transactionHash_
          contractId_
        }
        receiverAddeds(
          orderBy: timestamp_
          orderDirection: desc
          first: 1000
        ) {
          escrowId
          sender
          receiver
          amount
          tokenAddress
          block_number
          timestamp_
          transactionHash_
          contractId_
        }
        receiverRemoveds(
          orderBy: timestamp_
          orderDirection: desc
          first: 1000
        ) {
          escrowId
          sender
          receiver
          refundAmount
          tokenAddress
          block_number
          timestamp_
          transactionHash_
          contractId_
        }
        receiverAmountUpdateds(
          orderBy: timestamp_
          orderDirection: desc
          first: 1000
        ) {
          escrowId
          sender
          receiver
          oldAmount
          newAmount
          tokenAddress
          block_number
          timestamp_
          transactionHash_
          contractId_
        }
      }
    `;

    const response = await axios.post(GOLDSKY_ESCROW_API_URL, {
      query,
    });

    if (response.data.errors) {
      console.error("❌ GraphQL errors:", response.data.errors);
      return [];
    }

    const data = response.data.data;
    const allEvents = [];
    const userAddressLower = userAddress.toLowerCase();

    // Process escrow created events
    if (data.escrowCreateds) {
      data.escrowCreateds.forEach((event: any) => {
        if (event.sender && event.sender.toLowerCase() === userAddressLower) {
          allEvents.push({
            ...event,
            eventType: "ESCROW_CREATED",
            tokenType: determineTokenTypeFromContract(event.contractId_),
          });
        }
      });
    }

    // Process topup events
    if (data.fundsTopUps) {
      data.fundsTopUps.forEach((event: any) => {
        if (event.sender && event.sender.toLowerCase() === userAddressLower) {
          allEvents.push({
            ...event,
            eventType: "TOPUP_FUNDS",
            tokenType: determineTokenTypeFromContract(event.contractId_),
          });
        }
      });
    }

    // Process receiver added events
    if (data.receiverAddeds) {
      data.receiverAddeds.forEach((event: any) => {
        if (event.sender && event.sender.toLowerCase() === userAddressLower) {
          allEvents.push({
            ...event,
            eventType: "ADD_RECIPIENTS",
            tokenType: determineTokenTypeFromContract(event.contractId_),
          });
        }
      });
    }

    // Process receiver removed events
    if (data.receiverRemoveds) {
      data.receiverRemoveds.forEach((event: any) => {
        if (event.sender && event.sender.toLowerCase() === userAddressLower) {
          allEvents.push({
            ...event,
            eventType: "REMOVE_RECIPIENTS",
            tokenType: determineTokenTypeFromContract(event.contractId_),
          });
        }
      });
    }

    // Process receiver amount updated events
    if (data.receiverAmountUpdateds) {
      data.receiverAmountUpdateds.forEach((event: any) => {
        if (event.sender && event.sender.toLowerCase() === userAddressLower) {
          allEvents.push({
            ...event,
            eventType: "UPDATE_RECIPIENTS_AMOUNT",
            tokenType: determineTokenTypeFromContract(event.contractId_),
          });
        }
      });
    }

    // Sort all events by timestamp
    allEvents.sort((a, b) => parseInt(b.timestamp_) - parseInt(a.timestamp_));

    // Cache the result
    setCachedData(cacheKey, allEvents);

    return allEvents;
  } catch (error) {
    console.error("❌ Error fetching comprehensive escrow events:", error);
    return [];
  }
};

// buat senderdashboard
// buat senderdashboard - UPDATED to combine responses from both API URLs
export const fetchEscrowsFromIndexer = async (userAddress: string) => {
  try {
    const cacheKey = `sender_${userAddress.toLowerCase()}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    console.log("🔍 Fetching escrows for address:", userAddress);
    console.log("🔍 Address validation:", {
      address: userAddress,
      length: userAddress?.length,
      startsWith0x: userAddress?.startsWith("0x"),
      isLowerCase: userAddress === userAddress?.toLowerCase(),
    });

    const query = `
      query GetUserEscrows($userAddress: String!) {
        escrowCreateds(
          where: { sender: $userAddress }
          orderBy: timestamp_
          orderDirection: desc
          first: 100
        ) {
          escrowId
          sender
          receivers
          amounts
          totalAmount
          tokenAddress
          block_number
          timestamp_
          transactionHash_
          contractId_
        }
      }
    `;

    console.log("📤 Sending GraphQL query to both Goldsky APIs...");
    console.log("📤 Query variables:", { userAddress });

    // Fetch from both API URLs in parallel
    const [responseIdrx, responseUsdc] = await Promise.all([
      // IDRX API
      axios
        .post(
          process.env.NEXT_PUBLIC_GOLDSKY_ESCROW_IDRX_API_URL!,
          {
            query,
            variables: { userAddress: userAddress.toLowerCase() },
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
            timeout: 15000,
          },
        )
        .catch((error) => {
          console.warn("⚠️ IDRX API request failed:", error.message);
          return { data: { data: { escrowCreateds: [] }, errors: null } };
        }),

      // USDC/USDT API
      axios
        .post(
          process.env.NEXT_PUBLIC_GOLDSKY_ESCROW_API_URL!,
          {
            query,
            variables: { userAddress: userAddress.toLowerCase() },
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
            timeout: 15000,
          },
        )
        .catch((error) => {
          console.warn("⚠️ USDC API request failed:", error.message);
          return { data: { data: { escrowCreateds: [] }, errors: null } };
        }),
    ]);

    console.log("📥 IDRX API Response:", {
      status: responseIdrx.status || "failed",
      escrows: responseIdrx.data?.data?.escrowCreateds?.length || 0,
      errors: responseIdrx.data?.errors || null,
    });

    console.log("📥 USDC API Response:", {
      status: responseUsdc.status || "failed",
      escrows: responseUsdc.data?.data?.escrowCreateds?.length || 0,
      errors: responseUsdc.data?.errors || null,
    });

    // Handle errors from both APIs
    if (responseIdrx.data?.errors) {
      console.error("❌ GraphQL errors in IDRX API:", responseIdrx.data.errors);
    }

    if (responseUsdc.data?.errors) {
      console.error("❌ GraphQL errors in USDC API:", responseUsdc.data.errors);
    }

    // Combine escrows from both APIs
    const idrxEscrows = responseIdrx.data?.data?.escrowCreateds || [];
    const usdcEscrows = responseUsdc.data?.data?.escrowCreateds || [];

    // Combine and deduplicate by escrowId
    const allEscrowsMap = new Map();

    // Add IDRX escrows
    idrxEscrows.forEach((escrow: any) => {
      if (escrow.escrowId) {
        allEscrowsMap.set(escrow.escrowId, {
          ...escrow,
          source: "IDRX_API",
        });
      }
    });

    // Add USDC escrows (will overwrite if same escrowId exists)
    usdcEscrows.forEach((escrow: any) => {
      if (escrow.escrowId) {
        allEscrowsMap.set(escrow.escrowId, {
          ...escrow,
          source: "USDC_API",
        });
      }
    });

    const allEscrows = Array.from(allEscrowsMap.values());

    console.log("✅ Combined sender escrow data:", {
      idrxEscrows: idrxEscrows.length,
      usdcEscrows: usdcEscrows.length,
      totalUnique: allEscrows.length,
      deduplicatedCount:
        idrxEscrows.length + usdcEscrows.length - allEscrows.length,
    });

    // Filter escrows that belong to the sender
    const escrows = allEscrows
      .filter((escrow: any) => {
        return (
          escrow.sender &&
          escrow.sender.toLowerCase() === userAddress.toLowerCase()
        );
      })
      .sort((a: any, b: any) => {
        // Sort by timestamp descending (newest first)
        const timestampA = parseInt(a.timestamp_) || 0;
        const timestampB = parseInt(b.timestamp_) || 0;
        return timestampB - timestampA;
      })
      .slice(0, 100); // Limit to 100 most recent escrows

    console.log("📊 Raw combined escrows from indexer:", escrows);
    console.log("📊 Number of combined escrows found:", escrows.length);


    if (escrows.length === 0) {
      console.log("⚠️ No escrows found for sender address:", userAddress);
      return [];
    }

    // Process escrows and add contract data
    const transformedEscrows = await Promise.all(
      escrows.map(async (escrow: any, index: number) => {
        // Use tokenAddress from GraphQL data if available, otherwise fallback to contractId mapping
        const tokenAddress =
          escrow.tokenAddress ||
          mapContractIdToTokenAddress(escrow.contractId_);

        // Determine token type from source API first (most reliable)
        let tokenType: "USDC" | "USDT" | "IDRX" = "USDC";

        if (escrow.source === "IDRX_API") {
          tokenType = "IDRX";
        } else if (escrow.tokenAddress) {
          const detectedType = getTokenType(escrow.tokenAddress);
          tokenType =
            detectedType === "USDC" ||
            detectedType === "USDT" ||
            detectedType === "IDRX"
              ? detectedType
              : "USDC";
        } else if (escrow.contractId_) {
          tokenType = determineTokenTypeFromContract(escrow.contractId_);
        } else {
          // Default to USDC for USDC_API source
          tokenType = "USDC";
        }

        console.log(`🔍 Token type detection for escrow ${escrow.escrowId}:`, {
          source: escrow.source,
          tokenAddress: escrow.tokenAddress,
          contractId: escrow.contractId_,
          detectedTokenType: tokenType,
        });

        // Parse timestamp if available
        const createdAt = escrow.timestamp_
          ? new Date(parseInt(escrow.timestamp_) * 1000).toISOString()
          : new Date().toISOString();

        // Get contract address based on token type
        const contractAddress = getContractAddressByTokenType(tokenType);

        // Read additional details from smart contract
        const contractDetails = await getEscrowDetailsFromContract(
          escrow.escrowId,
          contractAddress,
        );

        return {
          id: `escrow-${index}`, // Generate ID since not available in indexer
          escrowId: escrow.escrowId,
          sender: escrow.sender,
          totalAmount: escrow.totalAmount || "0",
          createdAt: createdAt,
          receivers: escrow.receivers
            ? escrow.receivers.split(",").map((addr: string) => addr.trim())
            : [],
          amounts: escrow.amounts
            ? escrow.amounts.split(",").map((amount: string) => amount.trim())
            : [],
          tokenAddress: tokenAddress,
          tokenType: tokenType, // Dynamic token type based on source and tokenAddress
          blockNumber: escrow.block_number,
          transactionHash: escrow.transactionHash_,

          // Source tracking
          dataSource: escrow.source,

          // Additional contract data
          allocatedAmount: contractDetails?.totalAllocatedAmount || "0",
          depositedAmount: contractDetails?.totalDepositedAmount || "0",
          withdrawnAmount: contractDetails?.totalWithdrawnAmount || "0",
          availableBalance: contractDetails?.availableBalance || "0",
          receiverCount: contractDetails?.receiverCount || "0",
          activeReceiverCount: contractDetails?.activeReceiverCount || "0",
          lastTopUpAt: contractDetails?.lastTopUpAt || "0",
        };
      }),
    );

    console.log("✅ Transformed combined sender escrows:", {
      totalTransformed: transformedEscrows.length,
      sources: transformedEscrows.reduce((acc: any, escrow: any) => {
        acc[escrow.dataSource] = (acc[escrow.dataSource] || 0) + 1;
        return acc;
      }, {}),
      tokenTypes: transformedEscrows.reduce((acc: any, escrow: any) => {
        acc[escrow.tokenType] = (acc[escrow.tokenType] || 0) + 1;
        return acc;
      }, {}),
    });

    const {checkMultipleEscrowsStatus} = await import("../../lib/smartContract")

    const escrowsToCheck = transformedEscrows.map((escrow) => ({
      escrowId: escrow.escrowId,
      tokenAddress: escrow.tokenAddress,
    }))
    const statusResults = await checkMultipleEscrowsStatus(escrowsToCheck)
    const activeEscrows = transformedEscrows.filter((escrow) => {
      const isClosed = statusResults[escrow.escrowId]
      if(isClosed){
        return false
      }
      return true
    })
    console.log("✅ Final active escrows after blockchain filtering:", {
      originalCount: transformedEscrows.length,
      activeCount: activeEscrows.length,
      filteredOutCount: transformedEscrows.length - activeEscrows.length,
    });

    // Cache the result
    setCachedData(cacheKey, activeEscrows);
    // setCachedData(cacheKey, transformedEscrows);

    return activeEscrows;
    // return transformedEscrows;
  } catch (error) {
    console.error("❌ Error fetching combined escrows from indexer:", error);
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      userAddress,
      GOLDSKY_ESCROW_API_URL,
      GOLDSKY_ESCROW_IDRX_API_URL,
    });
    return [];
  }
};

//ini kali aja kepake
function mapContractIdToTokenAddress(contractId: string): string {
  console.log("🔍 Mapping contractId:", contractId);

  // Define contract mappings
  const contractMappings = {
    // USDC Contract
    EscrowContract:
      process.env.NEXT_PUBLIC_USDC_ADDRESS ||
      "0xf9D5a610fe990bfCdF7dd9FD64bdfe89D6D1eb4c",

    // IDRX Contract
    EscrowIdrxContract:
      process.env.NEXT_PUBLIC_IDRX_ADDRESS ||
      "0x77fEa84656B5EF40BF33e3835A9921dAEAadb976",

    // USDT Contract (if you have one)
    EscrowUsdtContract:
      process.env.NEXT_PUBLIC_USDT_ADDRESS ||
      "0x80327544e61e391304ad16f0BAFb2C5c7A76dfB3",
  };

  // Try exact match first
  if (contractMappings[contractId as keyof typeof contractMappings]) {
    const mappedAddress =
      contractMappings[contractId as keyof typeof contractMappings];
    console.log(`✅ Exact match: ${contractId} -> ${mappedAddress}`);
    return mappedAddress;
  }

  // Try pattern matching for contract addresses
  const lowerContractId = contractId?.toLowerCase() || "";

  if (lowerContractId.includes("idrx") || lowerContractId.includes("77fea84")) {
    console.log(`✅ Pattern match IDRX: ${contractId}`);
    return (
      process.env.NEXT_PUBLIC_IDRX_ADDRESS ||
      "0x77fEa84656B5EF40BF33e3835A9921dAEAadb976"
    );
  }

  if (
    lowerContractId.includes("usdt") ||
    lowerContractId.includes("80327544")
  ) {
    console.log(`✅ Pattern match USDT: ${contractId}`);
    return (
      process.env.NEXT_PUBLIC_USDT_ADDRESS ||
      "0x80327544e61e391304ad16f0BAFb2C5c7A76dfB3"
    );
  }

  // Default to USDC
  console.log(`⚠️ No match found for ${contractId}, defaulting to USDC`);
  return (
    process.env.NEXT_PUBLIC_USDC_ADDRESS ||
    "0xf9D5a610fe990bfCdF7dd9FD64bdfe89D6D1eb4c"
  );
}

function determineTokenTypeFromContract(
  contractId: string,
): "USDC" | "USDT" | "IDRX" {
  // Determine token type based on contract ID patterns or use API source
  const lowerContractId = contractId?.toLowerCase() || "";

  // Check for IDRX patterns
  if (lowerContractId.includes("idrx") || lowerContractId.includes("77fea84")) {
    return "IDRX";
  }

  // Check for USDT patterns
  if (
    lowerContractId.includes("usdt") ||
    lowerContractId.includes("80327544")
  ) {
    return "USDT";
  }

  // Default to USDC
  return "USDC";
}

const fetchReceiverEscrowsFromIndexer = async (receiverAddress: string) => {
  try {
    console.log("🔍 Fetching receiver escrows for address:", receiverAddress);

    const query = `
      query GetReceiverEscrows($receiverAddress: String!) {
        escrowCreateds(
          where: {receivers_contains: $receiverAddress}
          orderBy: timestamp_
          orderDirection: desc
          first: 100
        ) {
          escrowId
          sender
          receivers
          amounts
          totalAmount
          tokenAddress
          block_number
          timestamp_
          transactionHash_
          contractId_
        }
      }
    `;

    console.log("🔍 Receiver query variables:", {
      receiverAddress: receiverAddress.toLowerCase(),
      originalAddress: receiverAddress,
    });

    const response = await axios.post(
      GOLDSKY_ESCROW_API_URL,
      {
        query,
        variables: {
          receiverAddress: receiverAddress.toLowerCase(),
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 15000, // 15 second timeout for better reliability
      },
    );

    console.log("📥 Goldsky receiver API response:", response.data);
    console.log("📥 Receiver response status:", response.status);

    // Check for GraphQL errors
    if (response.data.errors) {
      console.error(
        "❌ GraphQL errors in receiver query:",
        response.data.errors,
      );
      return [];
    }

    // Transform the data to match our expected format
    const escrows = response.data.data.escrowCreateds || [];
    console.log("📊 Raw receiver escrows from indexer:", escrows);
    console.log("📊 Number of receiver escrows found:", escrows.length);

    if (escrows.length === 0) {
      console.log("⚠️ No receiver escrows found for address:", receiverAddress);
      console.log("🔍 Trying to debug - let's check all escrows...");

      // Debug: Get all escrows to see what's available
      const debugQuery = `
        query DebugAllEscrows {
          escrowCreateds(first: 5) {
            escrowId
            sender
            receivers
            amounts
          }
        }
      `;

      try {
        const debugResponse = await axios.post(GOLDSKY_ESCROW_API_URL, {
          query: debugQuery,
        });
        console.log(
          "🔍 Debug - Sample escrows:",
          debugResponse.data.data.escrowCreateds,
        );
      } catch (debugError) {
        console.error("❌ Debug query failed:", debugError);
      }

      return [];
    }

    const transformedEscrows = escrows
      .map((escrow: any, index: number) => {
        console.log(`🔍 Processing escrow ${index}:`, {
          escrowId: escrow.escrowId,
          receivers: escrow.receivers,
          amounts: escrow.amounts,
          tokenAddress: escrow.tokenAddress,
          receiverAddress: receiverAddress.toLowerCase(),
        });

        // Parse receivers and amounts arrays
        const receivers = escrow.receivers
          ? escrow.receivers
              .split(",")
              .map((addr: string) => addr.trim().toLowerCase())
          : [];
        const amounts = escrow.amounts
          ? escrow.amounts.split(",").map((amount: string) => amount.trim())
          : [];

        console.log(`🔍 Parsed data:`, {
          receivers,
          amounts,
          receiverAddress: receiverAddress.toLowerCase(),
        });

        // Find the index of the current receiver
        const receiverIndex = receivers.findIndex(
          (addr: string) => addr === receiverAddress.toLowerCase(),
        );

        console.log(`🔍 Receiver index:`, receiverIndex);

        // Get the amount allocated to this specific receiver
        const receiverAmount =
          receiverIndex >= 0 && amounts[receiverIndex]
            ? amounts[receiverIndex]
            : "0";

        console.log(`🔍 Receiver amount:`, receiverAmount);

        // Convert timestamp to proper date
        const createdDate = escrow.timestamp_
          ? new Date(parseInt(escrow.timestamp_) * 1000)
          : new Date();

        // Determine token type from tokenAddress
        const tokenType = getTokenType(escrow.tokenAddress);

        return {
          // Basic escrow info
          id: `receiver-escrow-${index}`,
          escrowId: escrow.escrowId,

          // Transaction data for receiver dashboard
          receiverWalletAddress: receiverAddress,
          senderWalletAddress: escrow.sender,
          senderName: `${escrow.sender.slice(0, 6)}...${escrow.sender.slice(-4)}`, // Shortened sender address as name

          // Amount data
          totalAmount: escrow.totalAmount || "0",
          availableAmount: receiverAmount, // Amount specifically for this receiver
          originCurrency: tokenType, // Dynamic token type based on tokenAddress

          // Token data
          tokenAddress: escrow.tokenAddress,

          // Transaction metadata
          transactionHash: escrow.transactionHash_,
          blockNumber: escrow.block_number,
          contractId: escrow.contractId_,

          // Dates
          createdAt: createdDate,

          // Status
          status: "AVAILABLE", // Default status for incoming transactions

          // Additional receiver data
          receiverIndex,
          allReceivers: receivers,
          allAmounts: amounts,
        };
      })
      .filter((escrow: any) => parseFloat(escrow.availableAmount) > 0); // Only return escrows with available amounts

    console.log("✅ Transformed receiver escrows:", transformedEscrows);
    console.log("✅ Number of transformed escrows:", transformedEscrows.length);
    console.log(
      "✅ Available amounts:",
      transformedEscrows.map((e: any) => e.availableAmount),
    );

    return transformedEscrows;
  } catch (error) {
    console.error("❌ Error fetching receiver escrows from indexer:", error);
    return [];
  }
};

// Get withdraw events for a specific receiver from onchain data
const fetchReceiverWithdrawEvents = async (receiverAddress: string) => {
  try {
    console.log("💸 Fetching withdraw events for receiver:", receiverAddress);

    const query = `
      query GetReceiverWithdraws($receiverAddress: String!) {
        withdrawFunds(
          where: {recipient: $receiverAddress}
          orderBy: timestamp_
          orderDirection: desc
          first: 100
        ) {
          escrowId
          recipient
          amount
          timestamp_
          transactionHash_
          block_number
        }
      }
    `;

    const response = await axios.post(
      GOLDSKY_ESCROW_API_URL,
      {
        query,
        variables: {
          receiverAddress: receiverAddress.toLowerCase(),
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 15000, // 15 second timeout for better reliability
      },
    );

    console.log("📥 Goldsky withdraw events response:", response.data);

    // Check if response has errors
    if (response.data.errors) {
      console.error(
        "❌ GraphQL errors in withdraw events response:",
        response.data.errors,
      );
      return [];
    }

    const withdrawEvents = response.data.data?.withdrawFunds || [];
    console.log("📊 Raw withdraw events:", withdrawEvents);

    return withdrawEvents.map((withdraw: any) => ({
      escrowId: withdraw.escrowId,
      recipient: withdraw.recipient,
      amount: withdraw.amount,
      timestamp: withdraw.timestamp_
        ? new Date(parseInt(withdraw.timestamp_) * 1000)
        : new Date(),
      transactionHash: withdraw.transactionHash_,
      blockNumber: withdraw.block_number,
    }));
  } catch (error) {
    console.error("❌ Error fetching withdraw events:", error);
    return [];
  }
};

// Optimized function to fetch receiver data with single combined query
const fetchReceiverDataOptimized = async (receiverAddress: string) => {
  try {
    const cacheKey = `receiver_${receiverAddress.toLowerCase()}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    console.log("🚀 Fetching optimized receiver data for:", receiverAddress);

    const query = `
      query GetReceiverData($receiverAddress: String!) {
        escrowCreateds(
          where: {receivers_contains: $receiverAddress}
          orderBy: timestamp_
          orderDirection: desc
          first: 100
        ) {
          escrowId
          sender
          receivers
          amounts
          totalAmount
          tokenAddress
          block_number
          timestamp_
          transactionHash_
          contractId_
        }
      }
    `;

    const response = await axios.post(
      GOLDSKY_ESCROW_API_URL,
      {
        query,
        variables: {
          receiverAddress: receiverAddress.toLowerCase(),
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 15000, // 15 second timeout for better reliability
      },
    );

    if (response.data.errors) {
      console.error(
        "❌ GraphQL errors in optimized receiver query:",
        response.data.errors,
      );
      return { escrowEvents: [], withdrawEvents: [] };
    }

    const escrowEvents = response.data.data.escrowCreateds || [];
    // For now, we'll skip withdraw events to avoid GraphQL errors
    // This can be added back later when the schema is confirmed
    const withdrawEvents: any[] = [];

    console.log("✅ Optimized receiver data fetched:", {
      escrowEvents: escrowEvents.length,
      withdrawEvents: withdrawEvents.length,
    });

    const result = { escrowEvents, withdrawEvents };

    // Cache the result
    setCachedData(cacheKey, result);

    return result;
  } catch (error) {
    console.error("❌ Error fetching optimized receiver data:", error);
    return { escrowEvents: [], withdrawEvents: [] };
  }
};

// receiverDashboard
// receiverDashboard - UPDATED to combine responses from both API URLs
const fetchReceiverEscrowsSimple = async (receiverAddress: string) => {
  try {
    console.log(
      "🚀 Fetching receiver escrows (simplified) for:",
      receiverAddress,
    );

    const cacheKey = `receiver_simple_${receiverAddress.toLowerCase()}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log("📦 Using cached data for:", cacheKey);
      // TEMPORARILY DISABLE CACHE TO TEST TOPUP CALCULATION
      // return cachedData;
    }

    const query = `
      query GetReceiverEscrowsSimple($receiverAddress: String!) {
        escrowCreateds(
          where: {receivers_contains: $receiverAddress}
          orderBy: timestamp_
          orderDirection: desc
          first: 100
        ) {
          receivers
          sender
          tokenAddress
          escrowId
          totalAmount
          amounts
          timestamp_
          transactionHash_
          block_number
          contractId_
        }
      }
    `;

    console.log("📤 Fetching from both Goldsky API URLs...");

    // Fetch from both API URLs in parallel
    const [responseIdrx, responseUsdc] = await Promise.all([
      // IDRX API
      axios
        .post(
          process.env.NEXT_PUBLIC_GOLDSKY_ESCROW_IDRX_API_URL!,
          {
            query,
            variables: { receiverAddress: receiverAddress.toLowerCase() },
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
            timeout: 15000,
          },
        )
        .catch((error) => {
          console.warn("⚠️ IDRX API request failed:", error.message);
          return { data: { data: { escrowCreateds: [] }, errors: null } };
        }),

      // USDC/USDT API
      axios
        .post(
          process.env.NEXT_PUBLIC_GOLDSKY_ESCROW_API_URL!,
          {
            query,
            variables: { receiverAddress: receiverAddress.toLowerCase() },
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
            timeout: 15000,
          },
        )
        .catch((error) => {
          console.warn("⚠️ USDC API request failed:", error.message);
          return { data: { data: { escrowCreateds: [] }, errors: null } };
        }),
    ]);

    console.log("📥 IDRX API Response:", {
      status: responseIdrx.status || "failed",
      escrows: responseIdrx.data?.data?.escrowCreateds?.length || 0,
      errors: responseIdrx.data?.errors || null,
    });

    console.log("📥 USDC API Response:", {
      status: responseUsdc.status || "failed",
      escrows: responseUsdc.data?.data?.escrowCreateds?.length || 0,
      errors: responseUsdc.data?.errors || null,
    });

    // Handle errors from both APIs
    if (responseIdrx.data?.errors) {
      console.error("❌ GraphQL errors in IDRX API:", responseIdrx.data.errors);
    }

    if (responseUsdc.data?.errors) {
      console.error("❌ GraphQL errors in USDC API:", responseUsdc.data.errors);
    }

    // Combine escrows from both APIs
    const idrxEscrows = responseIdrx.data?.data?.escrowCreateds || [];
    const usdcEscrows = responseUsdc.data?.data?.escrowCreateds || [];

    // Combine and deduplicate by escrowId
    const allEscrowsMap = new Map();

    // Add IDRX escrows
    idrxEscrows.forEach((escrow: any) => {
      if (escrow.escrowId) {
        allEscrowsMap.set(escrow.escrowId, {
          ...escrow,
          source: "IDRX_API",
        });
      }
    });

    // Add USDC escrows (will overwrite if same escrowId exists)
    usdcEscrows.forEach((escrow: any) => {
      if (escrow.escrowId) {
        allEscrowsMap.set(escrow.escrowId, {
          ...escrow,
          source: "USDC_API",
        });
      }
    });

    const allEscrows = Array.from(allEscrowsMap.values());

    console.log("✅ Combined escrow data:", {
      idrxEscrows: idrxEscrows.length,
      usdcEscrows: usdcEscrows.length,
      totalUnique: allEscrows.length,
      deduplicatedCount:
        idrxEscrows.length + usdcEscrows.length - allEscrows.length,
    });

    // No need to filter - GraphQL already filtered by receivers_contains
    const escrows = allEscrows;

    console.log("✅ Filtered and sorted receiver escrows:", {
      totalFiltered: escrows.length,
      sources: escrows.reduce((acc: any, escrow: any) => {
        acc[escrow.source] = (acc[escrow.source] || 0) + 1;
        return acc;
      }, {}),
    });

    // Transform the data to match our expected format
    const transformedEscrows = await Promise.all(
      escrows.map(async (escrow: any, index: number) => {
        console.log(`🔍 Processing combined escrow ${index}:`, {
          escrowId: escrow.escrowId,
          source: escrow.source,
          receivers: escrow.receivers,
          amounts: escrow.amounts,
          tokenAddress: escrow.tokenAddress,
          receiverAddress: receiverAddress.toLowerCase(),
        });

        // Parse receivers and amounts arrays
        const receivers = escrow.receivers
          ? escrow.receivers
              .split(",")
              .map((addr: string) => addr.trim().toLowerCase())
          : [];
        const amounts = escrow.amounts
          ? escrow.amounts.split(",").map((amount: string) => amount.trim())
          : [];

        // Find the index of the current receiver
        const receiverIndex = receivers.findIndex(
          (addr: string) => addr === receiverAddress.toLowerCase(),
        );

        // Get the amount allocated to this specific receiver
        const receiverAmount =
          receiverIndex >= 0 && amounts[receiverIndex]
            ? amounts[receiverIndex]
            : "0";

        // Convert timestamp to proper date
        const createdDate = escrow.timestamp_
          ? new Date(parseInt(escrow.timestamp_) * 1000)
          : new Date();

        // Determine token type from source API first (most reliable)
        let tokenType: "USDC" | "USDT" | "IDRX" = "USDC";

        if (escrow.source === "IDRX_API") {
          tokenType = "IDRX";
        } else if (escrow.tokenAddress) {
          const detectedType = getTokenType(escrow.tokenAddress);
          tokenType =
            detectedType === "USDC" ||
            detectedType === "USDT" ||
            detectedType === "IDRX"
              ? detectedType
              : "USDC";
        } else if (escrow.contractId_) {
          tokenType = determineTokenTypeFromContract(escrow.contractId_);
        } else {
          // Default to USDC for USDC_API source
          tokenType = "USDC";
        }

        // Get contract address based on token type
        const contractAddress = getContractAddressByTokenType(tokenType);

        // Read additional details from smart contract
        const contractDetails = await getEscrowDetailsFromContract(
          escrow.escrowId,
          contractAddress,
        );

        // Calculate actual available amount using Goldsky topup data
        console.log("🔍 Calling calculateAvailableAmountFromTopups for escrow:", escrow.escrowId);
        const topupData = await calculateAvailableAmountFromTopups(
          escrow.escrowId,
          receiverAddress,
          tokenType
        );
        console.log("🔍 Topup data result:", topupData);

        const availableBalance = contractDetails?.availableBalance || "0";
        const receiverAllocatedAmount = receiverAmount;

        // Use topup data for more accurate calculation
        const hasBeenFunded = parseFloat(topupData.totalTopups) > 0;
        const canClaim = topupData.canClaim;
        const actualAvailableAmount = topupData.availableAmount;

        console.log(`🔍 Receiver claim check for escrow ${escrow.escrowId}:`, {
          receiverAddress: receiverAddress.toLowerCase(),
          receiverAllocatedAmount,
          contractAvailableBalance: availableBalance,
          canClaim,
          actualAvailableAmount,
        });

        return {
          // Basic escrow info
          id: `receiver-escrow-${index}`,
          escrowId: escrow.escrowId,

          // Source tracking
          dataSource: escrow.source,

          // Transaction data for receiver dashboard
          receiverWalletAddress: receiverAddress,
          senderWalletAddress: escrow.sender,
          senderName: `${escrow.sender.slice(0, 6)}...${escrow.sender.slice(-4)}`,

          // Amount data - FIXED: Use actual available amount based on contract balance
          totalAmount: escrow.totalAmount || "0",
          availableAmount: actualAvailableAmount, // This is the key fix!
          originCurrency: tokenType,

          // Token data
          tokenAddress:
            escrow.tokenAddress ||
            mapContractIdToTokenAddress(escrow.contractId_ || ""),

          // Transaction metadata
          transactionHash: escrow.transactionHash_,
          blockNumber: escrow.block_number,
          contractId: escrow.contractId_,

          // Dates
          createdAt: createdDate,

          // Status
          status: canClaim ? "AVAILABLE" : "INSUFFICIENT_BALANCE",

          // Additional receiver data
          receiverIndex,
          allReceivers: receivers,
          allAmounts: amounts,

          // Additional contract data
          allocatedAmount: receiverAllocatedAmount,
          depositedAmount: contractDetails?.totalDepositedAmount || "0",
          withdrawnAmount: contractDetails?.totalWithdrawnAmount || "0",
          availableBalance: availableBalance,
          receiverCount: contractDetails?.receiverCount || "0",
          activeReceiverCount: contractDetails?.activeReceiverCount || "0",
          lastTopUpAt: contractDetails?.lastTopUpAt || "0",

          // Additional debugging info
          canClaim,
        };
      }),
    );

    // For debugging: also create unfiltered version
    const allTransformedEscrows = await Promise.all(
      escrows.map(async (escrow: any, index: number) => {
        console.log(`🔍 Processing combined escrow ${index} (unfiltered):`, {
          escrowId: escrow.escrowId,
          source: escrow.source,
          receivers: escrow.receivers,
          amounts: escrow.amounts,
          tokenAddress: escrow.tokenAddress,
          receiverAddress: receiverAddress.toLowerCase(),
        });

        // Parse receivers and amounts arrays
        const receivers = escrow.receivers
          ? escrow.receivers
              .split(",")
              .map((addr: string) => addr.trim().toLowerCase())
          : [];
        const amounts = escrow.amounts
          ? escrow.amounts.split(",").map((amount: string) => amount.trim())
          : [];

        // Find the index of the current receiver
        const receiverIndex = receivers.findIndex(
          (addr: string) => addr === receiverAddress.toLowerCase(),
        );

        // Get the amount allocated to this specific receiver
        const receiverAmount =
          receiverIndex >= 0 && amounts[receiverIndex]
            ? amounts[receiverIndex]
            : "0";

        // Convert timestamp to proper date
        const createdDate = escrow.timestamp_
          ? new Date(parseInt(escrow.timestamp_) * 1000)
          : new Date();

        // Determine token type from source API first (most reliable)
        let tokenType: "USDC" | "USDT" | "IDRX" = "USDC";

        if (escrow.source === "IDRX_API") {
          tokenType = "IDRX";
        } else if (escrow.tokenAddress) {
          const detectedType = getTokenType(escrow.tokenAddress);
          tokenType =
            detectedType === "USDC" ||
            detectedType === "USDT" ||
            detectedType === "IDRX"
              ? detectedType
              : "USDC";
        } else if (escrow.contractId_) {
          tokenType = determineTokenTypeFromContract(escrow.contractId_);
        } else {
          // Default to USDC for USDC_API source
          tokenType = "USDC";
        }

        // Get contract address based on token type
        const contractAddress = getContractAddressByTokenType(tokenType);

        // Read additional details from smart contract
        const contractDetails = await getEscrowDetailsFromContract(
          escrow.escrowId,
          contractAddress,
        );

        // Calculate actual available amount using Goldsky topup data
        console.log("🔍 Calling calculateAvailableAmountFromTopups for escrow (all):", escrow.escrowId);
        const topupData = await calculateAvailableAmountFromTopups(
          escrow.escrowId,
          receiverAddress,
          tokenType
        );
        console.log("🔍 Topup data result (all):", topupData);

        const availableBalance = contractDetails?.availableBalance || "0";
        const receiverAllocatedAmount = receiverAmount;

        // Use topup data for more accurate calculation
        const hasBeenFunded = parseFloat(topupData.totalTopups) > 0;
        const canClaim = topupData.canClaim;

        // Use topup data for available amount
        const actualAvailableAmount = topupData.availableAmount;

        // For display purposes, always show allocated amount, but add status
        const displayAmount = receiverAllocatedAmount;
        const claimableAmount = actualAvailableAmount;

        console.log(
          `🔍 Receiver check for escrow ${escrow.escrowId} (unfiltered):`,
          {
            receiverAddress: receiverAddress.toLowerCase(),
            receiverAllocatedAmount,
            contractAvailableBalance: availableBalance,
            canClaim,
            actualAvailableAmount,
            displayAmount,
            claimableAmount,
          },
        );

        return {
          // Basic escrow info
          id: `receiver-escrow-all-${index}`,
          escrowId: escrow.escrowId,

          // Source tracking
          dataSource: escrow.source,

          // Transaction data for receiver dashboard
          receiverWalletAddress: receiverAddress,
          senderWalletAddress: escrow.sender,
          senderName: `${escrow.sender.slice(0, 6)}...${escrow.sender.slice(-4)}`,

          // Amount data - Show allocated amount always, claimable amount separately
          totalAmount: escrow.totalAmount || "0",
          allocatedAmount: receiverAllocatedAmount, // Always show this
          availableAmount: actualAvailableAmount, // Only non-zero if claimable
          claimableAmount: claimableAmount, // For easier checking
          displayAmount: displayAmount, // For UI display
          originCurrency: tokenType,

          // Token data
          tokenAddress:
            escrow.tokenAddress ||
            mapContractIdToTokenAddress(escrow.contractId_ || ""),

          // Transaction metadata
          transactionHash: escrow.transactionHash_,
          blockNumber: escrow.block_number,
          contractId: escrow.contractId_,

          // Dates
          createdAt: createdDate,

          // Status - more detailed statuses
          status: canClaim ? "CLAIMABLE" : (hasBeenFunded ? "FUNDED" : "PENDING_FUNDING"),
          canClaim: canClaim,

          // Additional receiver data
          receiverIndex,
          allReceivers: receivers,
          allAmounts: amounts,

          // Additional contract data
          depositedAmount: contractDetails?.totalDepositedAmount || "0",
          withdrawnAmount: contractDetails?.totalWithdrawnAmount || "0",
          availableBalance: availableBalance,
          receiverCount: contractDetails?.receiverCount || "0",
          activeReceiverCount: contractDetails?.activeReceiverCount || "0",
          lastTopUpAt: contractDetails?.lastTopUpAt || "0",
        };
      }),
    );

    // Store both versions in cache with different keys
    setCachedData(cacheKey, transformedEscrows); // Claimable only (existing behavior)
    setCachedData(`${cacheKey}_all`, allTransformedEscrows); // All escrows (new)

    console.log("✅ Final combined and transformed receiver escrows:", {
      totalTransformed: transformedEscrows.length,
      totalAllEscrows: allTransformedEscrows.length,
      sources: transformedEscrows.reduce((acc: any, escrow: any) => {
        acc[escrow.dataSource] = (acc[escrow.dataSource] || 0) + 1;
        return acc;
      }, {}),
      tokenTypes: transformedEscrows.reduce((acc: any, escrow: any) => {
        acc[escrow.originCurrency] = (acc[escrow.originCurrency] || 0) + 1;
        return acc;
      }, {}),
      allEscrowsBreakdown: {
        claimable: allTransformedEscrows.filter((e) => e.canClaim).length,
        pending: allTransformedEscrows.filter((e) => !e.canClaim).length,
      },
    });

    console.log("✅ Performance summary:", {
      totalEscrowsFetched: allEscrows.length,
      idrxEscrowsFetched: idrxEscrows.length,
      usdcEscrowsFetched: usdcEscrows.length,
      filteredEscrows: escrows.length,
      finalTransformedEscrows: transformedEscrows.length,
      receiverAddress: receiverAddress,
    });

    // Cache the result
    setCachedData(cacheKey, transformedEscrows);

    return transformedEscrows;
  } catch (error) {
    console.error(
      "❌ Error fetching combined simplified receiver escrows:",
      error,
    );
    return [];
  }
};

// New function to fetch ALL receiver escrows (including non-claimable ones)
const fetchAllReceiverEscrows = async (receiverAddress: string) => {
  try {
    console.log(
      "🚀 Fetching ALL receiver escrows (including non-claimable) for:",
      receiverAddress,
    );

    // Try to get from cache first
    const cacheKey = `receiver_simple_${receiverAddress.toLowerCase()}_all`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log("✅ Returning cached ALL escrows data");
      return cachedData;
    }

    // If not in cache, run the main function which now stores both versions
    await fetchReceiverEscrowsSimple(receiverAddress);

    // Now get the "all" version from cache
    const allEscrowsData = getCachedData(cacheKey);
    if (allEscrowsData) {
      console.log("✅ Retrieved ALL escrows from cache after fetch:", {
        totalEscrows: allEscrowsData.length,
        claimableCount: allEscrowsData.filter((e: any) => e.canClaim).length,
        pendingCount: allEscrowsData.filter((e: any) => !e.canClaim).length,
      });
      return allEscrowsData;
    }

    console.warn("⚠️ Failed to get ALL escrows data from cache");
    return [];
  } catch (error) {
    console.error("❌ Error fetching ALL receiver escrows:", error);
    return [];
  }
};

// Calculate available withdrawals by comparing escrow created vs withdraw events
const calculateAvailableWithdrawals = async (receiverAddress: string) => {
  try {
    console.log("💰 Calculating available withdrawals for:", receiverAddress);

    // Use simplified receiver escrows function
    const escrowEvents = await fetchReceiverEscrowsSimple(receiverAddress);
    const withdrawEvents: any[] = []; // Skip withdraw events for now

    // Ensure we have valid arrays even if one fails
    const validEscrowEvents = Array.isArray(escrowEvents) ? escrowEvents : [];
    const validWithdrawEvents = Array.isArray(withdrawEvents)
      ? withdrawEvents
      : [];

    console.log("📊 Processing escrow vs withdraw data...");
    console.log("📊 Escrow events:", validEscrowEvents.length);
    console.log("📊 Withdraw events:", validWithdrawEvents.length);

    // Create a map of withdrawn amounts per escrow
    const withdrawnAmounts: { [escrowId: string]: number } = {};
    validWithdrawEvents.forEach((withdraw: any) => {
      if (!withdrawnAmounts[withdraw.escrowId]) {
        withdrawnAmounts[withdraw.escrowId] = 0;
      }
      withdrawnAmounts[withdraw.escrowId] += parseFloat(withdraw.amount || "0");
    });

    console.log("📊 Withdrawn amounts map:", withdrawnAmounts);

    // Calculate available amounts
    const availableWithdrawals = validEscrowEvents
      .map((escrow: any) => {
        const allocatedAmount = parseFloat(escrow.availableAmount || "0");
        const withdrawnAmount = withdrawnAmounts[escrow.escrowId] || 0;
        const availableAmount = allocatedAmount - withdrawnAmount;

        console.log(`🔍 Processing withdrawal for escrow ${escrow.escrowId}:`, {
          allocatedAmount,
          withdrawnAmount,
          availableAmount,
          availableAmountString: escrow.availableAmount,
          tokenAddress: escrow.tokenAddress,
        });

        return {
          ...escrow,
          allocatedAmount: allocatedAmount.toString(),
          withdrawnAmount: withdrawnAmount.toString(),
          availableAmount: Math.max(0, availableAmount).toString(), // Ensure non-negative
          hasWithdrawn: withdrawnAmount > 0,
          // Ensure tokenAddress is preserved
          tokenAddress: escrow.tokenAddress,
        };
      })
      .filter((escrow: any) => parseFloat(escrow.availableAmount) > 0);

    console.log(
      "📊 Available withdrawals after filtering:",
      availableWithdrawals.length,
    );
    console.log("📊 Available withdrawals data:", availableWithdrawals);

    const totalAvailable = availableWithdrawals.reduce(
      (sum: number, withdrawal: any) =>
        sum + parseFloat(withdrawal.availableAmount),
      0,
    );

    console.log("✅ Available withdrawals calculated:", {
      totalEscrows: escrowEvents.length,
      availableWithdrawals: availableWithdrawals.length,
      totalAvailable: totalAvailable.toFixed(2),
    });

    return {
      availableWithdrawals,
      totalAvailable: totalAvailable.toString(),
      summary: {
        totalEscrows: escrowEvents.length,
        availableCount: availableWithdrawals.length,
        totalAllocated: escrowEvents
          .reduce(
            (sum: number, e: any) => sum + parseFloat(e.availableAmount),
            0,
          )
          .toString(),
        totalWithdrawn: Object.values(withdrawnAmounts)
          .reduce((sum: number, amount: number) => sum + amount, 0)
          .toString(),
      },
    };
  } catch (error) {
    console.error("❌ Error calculating available withdrawals:", error);
    return {
      availableWithdrawals: [],
      totalAvailable: "0",
      summary: {
        totalEscrows: 0,
        availableCount: 0,
        totalAllocated: "0",
        totalWithdrawn: "0",
      },
    };
  }
};

// Get comprehensive receiver dashboard data from onchain sources only
const fetchOnchainReceiverDashboardData = async (receiverAddress: string) => {
  try {
    console.log(
      "📋 Fetching comprehensive onchain receiver data for:",
      receiverAddress,
    );

    // Use simplified receiver escrows function
    const availableWithdrawals =
      await fetchReceiverEscrowsSimple(receiverAddress);

    // Calculate total available amount
    const totalAvailable = availableWithdrawals
      .reduce(
        (sum: number, withdrawal: any) =>
          sum + parseFloat(withdrawal.availableAmount || "0"),
        0,
      )
      .toString();

    console.log("✅ Receiver dashboard data ready:", {
      availableWithdrawals: availableWithdrawals.length,
      totalAvailable,
    });

    return {
      // Main data for dashboard
      incomingTransactions: availableWithdrawals,
      availableWithdrawals: availableWithdrawals,
      totalAvailable: totalAvailable,

      // Analytics data (simplified)
      withdrawHistory: [],
      summary: {
        totalEscrows: availableWithdrawals.length,
        availableCount: availableWithdrawals.length,
        totalAllocated: totalAvailable,
        totalWithdrawn: "0",
      },

      // For backward compatibility
      escrowEvents: availableWithdrawals,
    };
  } catch (error) {
    console.error("❌ Error fetching onchain receiver dashboard data:", error);
    return {
      incomingTransactions: [],
      availableWithdrawals: [],
      totalAvailable: "0",
      withdrawHistory: [],
      summary: {
        totalEscrows: 0,
        availableCount: 0,
        totalAllocated: "0",
        totalWithdrawn: "0",
      },
      escrowEvents: [],
    };
  }
};

// export const fetchEscrowDetailsFromIndexer = async (escrowId: string) => {
//   try {
//     const query = `
//       query GetEscrowDetails($escrowId: String!) {
//         escrowCreateds(where: { escrowId: $escrowId }) {
//           escrowId
//           sender
//           receivers
//           totalAmount
//           amounts
//         }
//       }
//     `;

//     const response = await axios.post(GOLDSKY_API_URL, {
//       query,
//       variables: { escrowId },
//     });

//     const escrow = response.data.data.escrowCreateds[0];
//     if (!escrow) return null;

//     // Transform the data to match our expected format
//     return {
//       id: `escrow-${escrowId}`, // Generate ID since not available in indexer
//       escrowId: escrow.escrowId,
//       sender: escrow.sender,
//       totalAmount: escrow.totalAmount || "0",
//       createdAt: Math.floor(Date.now() / 1000).toString(), // Current timestamp as fallback
//       receivers: escrow.receivers
//         ? escrow.receivers.split(",").map((addr: string) => addr.trim())
//         : [],
//       amounts: escrow.amounts
//         ? escrow.amounts.split(",").map((amount: string) => amount.trim())
//         : [],
//       tokenAddress: "0xf9D5a610fe990bfCdF7dd9FD64bdfe89D6D1eb4c", // Default to USDC for now
//     };
//   } catch (error) {
//     console.error("Error fetching escrow details from indexer:", error);
//     return null;
//   }
// };

// ============= ESCROW EVENT TRACKING API FUNCTIONS =============

export const saveEscrowEvent = async (eventData: {
  eventType:
    | "ESCROW_CREATED"
    | "TOPUP_FUNDS"
    | "ADD_RECIPIENTS"
    | "REMOVE_RECIPIENTS"
    | "UPDATE_RECIPIENTS_AMOUNT"
    | "WITHDRAW_FUNDS"
    | "ESCROW_COMPLETED";
  escrowId: string;
  groupId: string;
  transactionHash: string;
  blockNumber?: string;
  initiatorWalletAddress: string;
  tokenType: "USDC" | "USDT" | "IDRX";
  eventData: any;
  metadata?: {
    gasUsed?: string;
    gasPrice?: string;
    networkId?: string;
    contractAddress?: string;
  };
  blockTimestamp?: string;
}) => {
  try {
    const response = await api.post("/escrow-events/save-event", eventData);
    return response.data;
  } catch (err) {
    console.error("Error saving escrow event:", err);
    throw err;
  }
};

// Get history berdasarkan escrowId
export const getEscrowEventHistory = async (escrowId: string) => {
  try {
    const response = await api.post("/escrow-events/get-history", { escrowId });
    return response.data;
  } catch (err) {
    console.error("Error getting escrow event history:", err);
    throw err;
  }
};

// Get semua events user
export const getUserEscrowEvents = async (
  _id: string,
  walletAddress: string,
) => {
  try {
    const response = await api.post("/escrow-events/get-user-events", {
      _id,
      walletAddress,
    });
    return response.data;
  } catch (err) {
    console.error("Error getting user escrow events:", err);
    throw err;
  }
};

// Get statistik dengan time range
export const getEscrowEventStatistics = async (
  _id: string,
  walletAddress: string,
  timeRange?: "24h" | "7d" | "30d" | "90d" | "all",
) => {
  try {
    const response = await api.post("/escrow-events/get-statistics", {
      _id,
      walletAddress,
      timeRange,
    });
    return response.data;
  } catch (err) {
    console.error("Error getting escrow event statistics:", err);
    throw err;
  }
};

// buat receiverDashboard
export const getReceiverTransactionStats = async (receiverAddress: string) => {
  try {
    const onchainData =
      await fetchOnchainReceiverDashboardData(receiverAddress);

    const stats = {
      totalEscrows: onchainData.summary.totalEscrows,
      availableEscrows: onchainData.summary.availableCount,
      totalAllocated: parseFloat(onchainData.summary.totalAllocated),
      totalWithdrawn: parseFloat(onchainData.summary.totalWithdrawn),
      totalAvailable: parseFloat(onchainData.totalAvailable),
      uniqueSenders: new Set(
        onchainData.availableWithdrawals.map((w: any) => w.senderWalletAddress),
      ).size,
      withdrawalHistory: onchainData.withdrawHistory,
    };

    console.log("✅ Receiver statistics calculated:", stats);
    return stats;
  } catch (error) {
    console.error("❌ Error calculating receiver stats:", error);
    return {
      totalEscrows: 0,
      availableEscrows: 0,
      totalAllocated: 0,
      totalWithdrawn: 0,
      totalAvailable: 0,
      uniqueSenders: 0,
      withdrawalHistory: [],
    };
  }
};

// Get detailed escrow information for a specific escrow ID
export const getEscrowDetails = async (escrowId: string) => {
  try {
    console.log("� Fetching detailed escrow information for:", escrowId);

    const query = `
      query GetEscrowDetails($escrowId: String!) {
        escrowCreateds(where: { escrowId: $escrowId }) {
          escrowId
          sender
          receivers
          amounts
          totalAmount
          block_number
          timestamp_
          transactionHash_
          contractId_
        }
        withdrawFundss(where: { escrowId: $escrowId }) {
          recipient
          amount
          timestamp_
          transactionHash_
          block_number
        }
      }
    `;

    const response = await axios.post(GOLDSKY_ESCROW_API_URL, {
      query,
      variables: { escrowId },
    });

    const data = response.data.data;
    const escrowData = data.escrowCreateds[0];
    const withdraws = data.withdrawFundss || [];

    if (!escrowData) {
      return null;
    }

    // Parse recipients and amounts
    const receivers = escrowData.receivers
      ? escrowData.receivers.split(",").map((addr: string) => addr.trim())
      : [];
    const amounts = escrowData.amounts
      ? escrowData.amounts.split(",").map((amount: string) => amount.trim())
      : [];

    // Create recipient details
    const recipients = receivers.map((address: string, index: number) => ({
      address,
      allocatedAmount: amounts[index] || "0",
      withdrawnAmount: withdraws
        .filter((w: any) => w.recipient.toLowerCase() === address.toLowerCase())
        .reduce((sum: number, w: any) => sum + parseFloat(w.amount || "0"), 0)
        .toString(),
    }));

    const result = {
      ...escrowData,
      recipients,
      withdrawHistory: withdraws,
      createdAt: escrowData.timestamp_
        ? new Date(parseInt(escrowData.timestamp_) * 1000)
        : new Date(),
      totalWithdrawn: withdraws
        .reduce((sum: number, w: any) => sum + parseFloat(w.amount || "0"), 0)
        .toString(),
    };

    console.log("✅ Escrow details fetched:", result);
    return result;
  } catch (error) {
    console.error("❌ Error fetching escrow details:", error);
    return null;
  }
};

// buat receiverDashboard
export const fetchReceiverDashboardData = async (
  walletAddress: string,
): Promise<{
  incomingTransactions: any[];
  availableWithdrawals: any[];
  escrowEvents: any[];
  totalAvailable: string;
}> => {
  try {
    console.log(
      "📋 Fetching receiver dashboard data from onchain sources for:",
      walletAddress,
    );

    // Use onchain-only data fetcher
    const onchainData = await fetchOnchainReceiverDashboardData(walletAddress);

    console.log("✅ Onchain receiver dashboard data ready:", {
      incomingTransactions: onchainData.incomingTransactions.length,
      availableWithdrawals: onchainData.availableWithdrawals.length,
      totalAvailable: onchainData.totalAvailable,
    });

    return {
      incomingTransactions: onchainData.incomingTransactions,
      availableWithdrawals: onchainData.availableWithdrawals,
      escrowEvents: onchainData.escrowEvents,
      totalAvailable: onchainData.totalAvailable,
    };
  } catch (error) {
    console.error("❌ Error fetching onchain receiver dashboard data:", error);
    return {
      incomingTransactions: [],
      availableWithdrawals: [],
      escrowEvents: [],
      totalAvailable: "0",
    };
  }
};

// New function to fetch ALL receiver dashboard data (including non-claimable escrows)
export const fetchAllReceiverDashboardData = async (
  walletAddress: string,
): Promise<{
  incomingTransactions: any[];
  availableWithdrawals: any[];
  allEscrows: any[];
  escrowEvents: any[];
  totalAvailable: string;
  totalAllocated: string;
}> => {
  try {
    console.log(
      "📋 Fetching ALL receiver dashboard data (including non-claimable) for:",
      walletAddress,
    );

    // Get ALL escrows (including non-claimable ones)
    const allEscrows = await fetchAllReceiverEscrows(walletAddress);

    // Separate claimable and non-claimable
    const claimableEscrows = allEscrows.filter(
      (escrow: any) => escrow.canClaim,
    );
    const pendingEscrows = allEscrows.filter((escrow: any) => !escrow.canClaim);

    // Calculate totals
    const totalAvailable = claimableEscrows
      .reduce(
        (sum: number, escrow: any) =>
          sum + parseFloat(escrow.availableAmount || "0"),
        0,
      )
      .toString();

    const totalAllocated = allEscrows
      .reduce(
        (sum: number, escrow: any) =>
          sum + parseFloat(escrow.allocatedAmount || "0"),
        0,
      )
      .toString();

    console.log("✅ ALL receiver dashboard data ready:", {
      totalEscrows: allEscrows.length,
      claimableEscrows: claimableEscrows.length,
      pendingEscrows: pendingEscrows.length,
      totalAvailable,
      totalAllocated,
    });

    return {
      incomingTransactions: allEscrows, // All escrows as incoming transactions
      availableWithdrawals: claimableEscrows, // Only claimable ones
      allEscrows: allEscrows, // All escrows including pending
      escrowEvents: allEscrows,
      totalAvailable: totalAvailable,
      totalAllocated: totalAllocated,
    };
  } catch (error) {
    console.error("❌ Error fetching ALL receiver dashboard data:", error);
    return {
      incomingTransactions: [],
      availableWithdrawals: [],
      allEscrows: [],
      escrowEvents: [],
      totalAvailable: "0",
      totalAllocated: "0",
    };
  }
};

// Note: determineTokenTypeFromContract function already exists earlier in the file

// Function to fetch sender-specific events: TOPUP_FUNDS, UPDATE_RECIPIENTS_AMOUNT, REMOVE_RECIPIENTS
export const fetchSenderEvents = async (userAddress: string) => {
  try {
    const cacheKey = `sender_events_${userAddress.toLowerCase()}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    console.log("🔍 Fetching sender-specific events for:", userAddress);
    console.log("🌐 Environment URLs:", {
      GOLDSKY_ESCROW_API_URL,
      GOLDSKY_ESCROW_IDRX_API_URL,
      areUrlsDefined: !!GOLDSKY_ESCROW_API_URL && !!GOLDSKY_ESCROW_IDRX_API_URL,
    });

    const userAddressLower = userAddress.toLowerCase();

    // First, get all escrow IDs created by this sender
    const senderEscrows = await fetchEscrowsFromIndexer(userAddressLower);
    const senderEscrowIds = senderEscrows.map((escrow: any) => escrow.escrowId);

    console.log("📋 Found sender escrow IDs:", senderEscrowIds);

    // If no escrows found, return empty array early
    if (senderEscrowIds.length === 0) {
      console.log("⚠️ No escrows found for sender, returning empty events");
      setCachedData(cacheKey, []);
      return [];
    }

    // Query for sender-specific events from both USDC/USDT and IDRX contracts
    const queries = [
      {
        url: GOLDSKY_ESCROW_API_URL,
        query: `
          query GetSenderEvents($userAddress: String!, $escrowIds: [String!]) {
            escrowCreateds(
              where: { sender: $userAddress }
              orderBy: timestamp_
              orderDirection: desc
              first: 100
            ) {
              escrowId
              sender
              receivers
              amounts
              totalAmount
              tokenAddress
              block_number
              timestamp_
              transactionHash_
              contractId_
            }
            fundsTopUps(
              where: { sender: $userAddress }
              orderBy: timestamp_
              orderDirection: desc
              first: 100
            ) {
              escrowId
              sender
              amount
              newCycleBalance
              block_number
              timestamp_
              transactionHash_
              contractId_
            }
            receiverRemoveds(
              where: { escrowId_in: $escrowIds }
              orderBy: timestamp_
              orderDirection: desc
              first: 100
            ) {
              escrowId
              receiver
              refundAmount
              block_number
              timestamp_
              transactionHash_
              contractId_
            }
            receiverAmountUpdateds(
              where: { escrowId_in: $escrowIds }
              orderBy: timestamp_
              orderDirection: desc
              first: 100
            ) {
              escrowId
              receiver
              oldAmount
              newAmount
              block_number
              timestamp_
              transactionHash_
              contractId_
            }
          }
        `,
        variables: {
          userAddress: userAddressLower,
          escrowIds: senderEscrowIds,
        },
      },
    ];

    // Add IDRX contract query if available
    if (GOLDSKY_ESCROW_IDRX_API_URL) {
      queries.push({
        url: GOLDSKY_ESCROW_IDRX_API_URL,
        query: `
          query GetSenderEventsIDRX($userAddress: String!, $escrowIds: [String!]) {
            escrowCreateds(
              where: { sender: $userAddress }
              orderBy: timestamp_
              orderDirection: desc
              first: 100
            ) {
              escrowId
              sender
              receivers
              amounts
              totalAmount
              tokenAddress
              block_number
              timestamp_
              transactionHash_
              contractId_
            }
            fundsTopUps(
              where: { sender: $userAddress }
              orderBy: timestamp_
              orderDirection: desc
              first: 100
            ) {
              escrowId
              sender
              amount
              newCycleBalance
              block_number
              timestamp_
              transactionHash_
              contractId_
            }
            receiverRemoveds(
              where: { escrowId_in: $escrowIds }
              orderBy: timestamp_
              orderDirection: desc
              first: 100
            ) {
              escrowId
              receiver
              refundAmount
              block_number
              timestamp_
              transactionHash_
              contractId_
            }
            receiverAmountUpdateds(
              where: { escrowId_in: $escrowIds }
              orderBy: timestamp_
              orderDirection: desc
              first: 100
            ) {
              escrowId
              receiver
              oldAmount
              newAmount
              block_number
              timestamp_
              transactionHash_
              contractId_
            }
          }
        `,
        variables: {
          userAddress: userAddressLower,
          escrowIds: senderEscrowIds,
        },
      });
    }

    const allEvents: any[] = [];

    // Execute queries for all contracts
    for (const queryConfig of queries) {
      try {
        if (!queryConfig.url) {
          console.warn("⚠️ Skipping query with undefined URL");
          continue;
        }

        console.log("📡 Executing sender query to:", queryConfig.url);
        console.log("🔍 Query variables:", queryConfig.variables);

        const response = await axios.post(queryConfig.url, {
          query: queryConfig.query,
          variables: queryConfig.variables,
        });

        if (response.data.errors) {
          console.error("❌ GraphQL errors:", response.data.errors);
          continue;
        }

        const data = response.data.data;
        console.log("📊 Response data keys:", Object.keys(data));
        console.log("📊 Response data:", data);

        // Determine token type based on which API URL was used
        const tokenType =
          queryConfig.url === GOLDSKY_ESCROW_IDRX_API_URL ? "IDRX" : "USDC";
        console.log(
          `🪙 Token type determined from API URL: ${tokenType} (URL: ${queryConfig.url})`,
        );

        // Process escrow created events
        if (data.escrowCreateds) {
          data.escrowCreateds.forEach((event: any) => {
            // Validate required fields
            if (event.escrowId && event.sender && event.timestamp_) {
              allEvents.push({
                ...event,
                eventType: "ESCROW_CREATED",
                tokenType: tokenType,
              });
            }
          });
        }

        // Process topup events
        if (data.fundsTopUps) {
          data.fundsTopUps.forEach((event: any) => {
            // Validate required fields
            if (event.escrowId && event.amount && event.timestamp_) {
              allEvents.push({
                ...event,
                eventType: "TOPUP_FUNDS",
                tokenType: tokenType,
              });
            }
          });
        }

        // Process receiver removed events (already filtered by escrowId_in query)
        if (data.receiverRemoveds) {
          data.receiverRemoveds.forEach((event: any) => {
            // Validate required fields
            if (event.escrowId && event.receiver && event.timestamp_) {
              allEvents.push({
                ...event,
                eventType: "REMOVE_RECIPIENTS",
                tokenType: tokenType,
              });
            }
          });
        }

        // Process receiver amount updated events (already filtered by escrowId_in query)
        if (data.receiverAmountUpdateds) {
          data.receiverAmountUpdateds.forEach((event: any) => {
            // Validate required fields
            if (
              event.escrowId &&
              event.receiver &&
              event.newAmount &&
              event.timestamp_
            ) {
              allEvents.push({
                ...event,
                eventType: "UPDATE_RECIPIENTS_AMOUNT",
                tokenType: tokenType,
              });
            }
          });
        }
      } catch (error) {
        console.error(`❌ Error fetching from ${queryConfig.url}:`, error);
      }
    }

    // Sort all events by timestamp (newest first)
    allEvents.sort((a, b) => parseInt(b.timestamp_) - parseInt(a.timestamp_));

    console.log("📊 Sender events fetched:", {
      totalEvents: allEvents.length,
      createdEvents: allEvents.filter((e) => e.eventType === "ESCROW_CREATED")
        .length,
      topupEvents: allEvents.filter((e) => e.eventType === "TOPUP_FUNDS")
        .length,
      removeEvents: allEvents.filter((e) => e.eventType === "REMOVE_RECIPIENTS")
        .length,
      updateEvents: allEvents.filter(
        (e) => e.eventType === "UPDATE_RECIPIENTS_AMOUNT",
      ).length,
    });

    // Debug logging for sample events
    console.log("📄 Final sender events summary:", {
      totalEvents: allEvents.length,
      eventTypes: allEvents.map((e) => e.eventType),
      sampleEvent: allEvents[0] || null,
    });

    // Cache the result
    setCachedData(cacheKey, allEvents);

    return allEvents;
  } catch (error) {
    console.error("❌ Error fetching sender events:", error);
    return [];
  }
};

// Function to fetch receiver-specific events: WITHDRAW_FUNDS
export const fetchReceiverEvents = async (
  userAddress: string,
  bypassCache: boolean = false,
) => {
  try {
    const cacheKey = `receiver_events_${userAddress.toLowerCase()}`;
    const cachedData = getCachedData(cacheKey);

    if (cachedData && !bypassCache) {
      console.log("📋 Using cached receiver events data");
      return cachedData;
    }

    if (bypassCache) {
      console.log("🔄 Bypassing cache for fresh receiver events data");
    }

    console.log("🔍 Fetching receiver-specific events for:", userAddress);
    console.log("🌐 API URLs:", {
      GOLDSKY_ESCROW_API_URL,
      GOLDSKY_ESCROW_IDRX_API_URL,
    });

    const userAddressLower = userAddress.toLowerCase();

    // Query using correct field names from GraphQL schema introspection
    // Using plural 'tokenWithdrawns' and only available fields (removed 'tokenAddress')
    const queries = [
      {
        url: GOLDSKY_ESCROW_API_URL,
        query: `
          query GetReceiverEvents($userAddress: String!) {
            tokenWithdrawns(
              where: { receiver: $userAddress }
              orderBy: timestamp_
              orderDirection: desc
              first: 100
            ) {
              id
              escrowId
              receiver
              amount
              depositWallet
              block_number
              timestamp_
              transactionHash_
              contractId_
            }
          }
        `,
        variables: { userAddress: userAddressLower },
      },
      {
        url: GOLDSKY_ESCROW_IDRX_API_URL,
        query: `
          query GetReceiverEventsIDRX($userAddress: String!) {
            idrxwithdrawns(
              where: { receiver: $userAddress }
              orderBy: timestamp_
              orderDirection: desc
              first: 100
            ) {
              id
              escrowId
              receiver
              amount
              depositWallet
              block_number
              timestamp_
              transactionHash_
              contractId_
            }
          }
        `,
        variables: { userAddress: userAddressLower },
      },
    ];

    const allEvents: any[] = [];

    // Execute queries for all contracts
    for (const queryConfig of queries) {
      try {
        if (!queryConfig.url) {
          console.warn("⚠️ Skipping query with undefined URL");
          continue;
        }

        console.log("📡 Executing query to:", queryConfig.url);
        console.log("🔍 Query variables:", queryConfig.variables);

        const response = await axios.post(queryConfig.url, queryConfig);

        console.log("📥 Response status:", response.status);
        console.log("📥 Response data:", response.data);

        if (response.data.errors) {
          console.error("❌ GraphQL errors:", response.data.errors);
          continue;
        }

        const data = response.data.data;

        // DEBUGGING: Try to inspect GraphQL schema to see available fields
        try {
          const schemaQuery = `
            query IntrospectSchema {
              __schema {
                queryType {
                  fields {
                    name
                    description
                  }
                }
              }
            }
          `;

          const schemaResponse = await axios.post(queryConfig.url, {
            query: schemaQuery,
          });

          console.log(
            "🔍 DEBUG - Available GraphQL fields:",
            schemaResponse.data?.data?.__schema?.queryType?.fields?.map(
              (f: any) => f.name,
            ) || [],
          );

          // Also try a simple query to see what withdraw-related fields exist
          const withdrawFieldsQuery = `
            query DebugWithdrawFields {
              __schema {
                queryType {
                  fields {
                    name
                  }
                }
              }
            }
          `;

          const withdrawFieldsResponse = await axios.post(queryConfig.url, {
            query: withdrawFieldsQuery,
          });

          const availableFields =
            withdrawFieldsResponse.data?.data?.__schema?.queryType?.fields?.map(
              (f: any) => f.name,
            ) || [];
          const withdrawFields = availableFields.filter(
            (field: string) =>
              field.toLowerCase().includes("withdraw") ||
              field.toLowerCase().includes("token"),
          );

          console.log("🔍 DEBUG - Withdraw-related fields:", withdrawFields);
        } catch (debugError) {
          console.warn("⚠️ Schema introspection failed:", debugError);
        }

        // Determine token type based on which API URL was used
        const tokenType =
          queryConfig.url === GOLDSKY_ESCROW_IDRX_API_URL ? "IDRX" : "USDC";
        console.log(
          `🪙 Token type determined from API URL: ${tokenType} (URL: ${queryConfig.url})`,
        );

        console.log("📊 Raw GraphQL response data:", {
          tokenWithdrawns: data.tokenWithdrawns?.length || 0,
          idrxwithdrawns: data.idrxwithdrawns?.length || 0,
          tokenWithdraws: data.tokenWithdraws?.length || 0,
          withdrawToCryptos: data.withdrawToCryptos?.length || 0,
          allDataKeys: Object.keys(data),
          sampleData:
            data.tokenWithdrawns?.[0] || data.idrxwithdrawns?.[0] || null,
        });

        // Process token withdrawn events (crypto withdrawals) - primary event type
        if (data.tokenWithdrawns) {
          console.log(
            "✅ Found tokenWithdrawns events:",
            data.tokenWithdrawns.length,
          );
          data.tokenWithdrawns.forEach((event: any) => {
            allEvents.push({
              ...event,
              // Normalize field names - use 'recipient' for consistency
              recipient: event.receiver || event.recipient,
              eventType: "WITHDRAW_FUNDS",
              withdrawType: "CRYPTO",
              tokenType: tokenType,
              eventSource: "tokenWithdrawns",
              // Add tokenAddress based on tokenType since it's not in the schema
              tokenAddress:
                tokenType === "IDRX"
                  ? process.env.NEXT_PUBLIC_IDRX_ADDRESS ||
                    "0x77fEa84656B5EF40BF33e3835A9921dAEAadb976"
                  : process.env.NEXT_PUBLIC_USDC_ADDRESS ||
                    "0xf9D5a610fe990bfCdF7dd9FD64bdfe89D6D1eb4c",
            });
          });
        }

        // Process IDRX withdrawn events (for IDRX API)
        if (data.idrxwithdrawns) {
          console.log(
            "✅ Found idrxwithdrawns events:",
            data.idrxwithdrawns.length,
          );
          data.idrxwithdrawns.forEach((event: any) => {
            allEvents.push({
              ...event,
              // Normalize field names - use 'recipient' for consistency
              recipient: event.receiver || event.recipient,
              eventType: "WITHDRAW_FUNDS",
              withdrawType: "CRYPTO",
              tokenType: tokenType,
              eventSource: "idrxwithdrawns",
              // Add tokenAddress based on tokenType since it's not in the schema
              tokenAddress:
                tokenType === "IDRX"
                  ? process.env.NEXT_PUBLIC_IDRX_ADDRESS ||
                    "0x77fEa84656B5EF40BF33e3835A9921dAEAadb976"
                  : process.env.NEXT_PUBLIC_USDC_ADDRESS ||
                    "0xf9D5a610fe990bfCdF7dd9FD64bdfe89D6D1eb4c",
            });
          });
        }

        // Process alternative withdrawal event name
        if (data.tokenWithdraws) {
          console.log(
            "✅ Found tokenWithdraws events:",
            data.tokenWithdraws.length,
          );
          data.tokenWithdraws.forEach((event: any) => {
            allEvents.push({
              ...event,
              recipient: event.receiver || event.recipient,
              eventType: "WITHDRAW_FUNDS",
              withdrawType: "CRYPTO",
              tokenType: tokenType,
              eventSource: "tokenWithdraws",
            });
          });
        }

        // Process withdrawToCrypto events specifically
        if (data.withdrawToCryptos) {
          console.log(
            "✅ Found withdrawToCryptos events:",
            data.withdrawToCryptos.length,
          );
          data.withdrawToCryptos.forEach((event: any) => {
            allEvents.push({
              ...event,
              eventType: "WITHDRAW_FUNDS",
              withdrawType: "CRYPTO",
              tokenType: tokenType,
              eventSource: "withdrawToCryptos",
            });
          });
        }
      } catch (error) {
        console.error(`❌ Error fetching from ${queryConfig.url}:`, error);
      }
    }

    // Sort all events by timestamp (newest first)
    allEvents.sort((a, b) => parseInt(b.timestamp_) - parseInt(a.timestamp_));

    console.log("📊 Receiver events fetched:", {
      totalEvents: allEvents.length,
      cryptoWithdraws: allEvents.filter((e) => e.withdrawType === "CRYPTO")
        .length,
      fiatWithdraws: allEvents.filter((e) => e.withdrawType === "FIAT").length,
    });

    // Cache the result
    setCachedData(cacheKey, allEvents);

    return allEvents;
  } catch (error) {
    console.error("❌ Error fetching receiver events:", error);
    return [];
  }
};

// ===================================================================
// VESTING FUNCTIONS
// ===================================================================

// Interface untuk vesting info
export interface VestingInfo {
  isVestingEnabled: boolean;
  vestingStartTime: bigint;
  vestingDuration: bigint;
  vestingEndTime: bigint;
  currentTime: bigint;
}

// Interface untuk receiver vesting info
export interface ReceiverVestingInfo {
  vestedAmount: bigint;
  totalVestedAmount: bigint;
  availableToClaim: bigint;
  vestingProgress: bigint; // Progress dalam basis point (0-10000, 10000 = 100%)
}

// Interface untuk vesting progress summary
export interface VestingProgressSummary {
  escrowId: string;
  tokenType: TokenType;
  vestingInfo: VestingInfo;
  totalAllocated: bigint;
  totalVested: bigint;
  totalClaimed: bigint;
  remainingToVest: bigint;
  progressPercentage: number;
  receivers: Array<{
    address: string;
    allocation: bigint;
    vestedAmount: bigint;
    claimedAmount: bigint;
    availableToClaim: bigint;
    vestingProgress: number;
  }>;
}

/**
 * Get vesting information for an escrow (untuk Sender)
 * @param escrowId - ID escrow
 * @param tokenType - Jenis token (USDC, USDT, IDRX)
 */
export const getEscrowVestingInfo = async (
  escrowId: string,
  tokenType: TokenType,
): Promise<VestingInfo | null> => {
  try {
    console.log("🔍 Getting vesting info for escrow:", { escrowId, tokenType });

    // Pilih contract berdasarkan token type
    const contractAddress =
      tokenType === "IDRX"
        ? getEscrowAddress("IDRX")
        : getEscrowAddress("USDC");

    const abi =
      tokenType === "IDRX"
        ? escrowIdrxAbis
        : escrowAbis;

    // Format escrow ID sebagai bytes32
    let formattedEscrowId = escrowId;
    if (!escrowId.startsWith("0x")) {
      formattedEscrowId = "0x" + escrowId;
    }
    if (formattedEscrowId.length < 66) {
      formattedEscrowId = formattedEscrowId.padEnd(66, "0");
    }

    // Call smart contract untuk mendapatkan vesting info
    const vestingInfo = await publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi: abi,
      functionName: "getVestingInfo",
      args: [formattedEscrowId as `0x${string}`],
    });

    console.log("✅ Vesting info fetched:", vestingInfo);

    return {
      isVestingEnabled: vestingInfo[0] as boolean,
      vestingStartTime: vestingInfo[1] as bigint,
      vestingDuration: vestingInfo[2] as bigint,
      vestingEndTime: vestingInfo[3] as bigint,
      currentTime: vestingInfo[4] as bigint,
    };
  } catch (error) {
    console.error("❌ Error getting vesting info:", error);
    return null;
  }
};

/**
 * Get vesting information for a specific receiver (untuk Receiver)
 * @param escrowId - ID escrow
 * @param receiverAddress - Alamat receiver
 * @param tokenType - Jenis token
 */
export const getReceiverVestingInfo = async (
  escrowId: string,
  receiverAddress: string,
  tokenType: TokenType,
): Promise<ReceiverVestingInfo | null> => {
  try {
    console.log("🔍 Getting receiver vesting info:", {
      escrowId,
      receiverAddress,
      tokenType,
    });

    // Pilih contract berdasarkan token type
    const contractAddress =
      tokenType === "IDRX"
        ? getEscrowAddress("IDRX")
        : getEscrowAddress("USDC");

    const abi =
      tokenType === "IDRX"
        ? escrowIdrxAbis
        : escrowAbis;

    // Format escrow ID sebagai bytes32
    let formattedEscrowId = escrowId;
    if (!escrowId.startsWith("0x")) {
      formattedEscrowId = "0x" + escrowId;
    }
    if (formattedEscrowId.length < 66) {
      formattedEscrowId = formattedEscrowId.padEnd(66, "0");
    }

    // Validasi dan format receiver address
    const formattedReceiverAddress = receiverAddress
      .toLowerCase()
      .startsWith("0x")
      ? receiverAddress.toLowerCase()
      : `0x${receiverAddress.toLowerCase()}`;

    // Call smart contract untuk mendapatkan receiver vesting info
    const receiverVestingInfo = await publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi: abi,
      functionName: "getReceiverVestingInfo",
      args: [
        formattedEscrowId as `0x${string}`,
        formattedReceiverAddress as `0x${string}`,
      ],
    });

    console.log("✅ Receiver vesting info fetched:", receiverVestingInfo);

    return {
      vestedAmount: receiverVestingInfo[0] as bigint,
      totalVestedAmount: receiverVestingInfo[1] as bigint,
      availableToClaim: receiverVestingInfo[2] as bigint,
      vestingProgress: receiverVestingInfo[3] as bigint,
    };
  } catch (error) {
    console.error("❌ Error getting receiver vesting info:", error);
    return null;
  }
};

/**
 * Calculate vested amount for a receiver at current time
 * @param escrowId - ID escrow
 * @param receiverAddress - Alamat receiver
 * @param tokenType - Jenis token
 */
export const calculateVestedAmount = async (
  escrowId: string,
  receiverAddress: string,
  tokenType: TokenType,
): Promise<{ vestedAmount: bigint; totalVestedAmount: bigint } | null> => {
  try {
    console.log("🔍 Calculating vested amount:", {
      escrowId,
      receiverAddress,
      tokenType,
    });

    // Pilih contract berdasarkan token type
    const contractAddress =
      tokenType === "IDRX"
        ? getEscrowAddress("IDRX")
        : getEscrowAddress("USDC");

    const abi =
      tokenType === "IDRX"
        ? escrowIdrxAbis
        : escrowAbis;

    // Format escrow ID sebagai bytes32
    let formattedEscrowId = escrowId;
    if (!escrowId.startsWith("0x")) {
      formattedEscrowId = "0x" + escrowId;
    }
    if (formattedEscrowId.length < 66) {
      formattedEscrowId = formattedEscrowId.padEnd(66, "0");
    }

    // Validasi dan format receiver address
    const formattedReceiverAddress = receiverAddress
      .toLowerCase()
      .startsWith("0x")
      ? receiverAddress.toLowerCase()
      : `0x${receiverAddress.toLowerCase()}`;

    // Call smart contract untuk calculate vested amount
    const vestedAmountInfo = await publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi: abi,
      functionName: "calculateVestedAmount",
      args: [
        formattedEscrowId as `0x${string}`,
        formattedReceiverAddress as `0x${string}`,
      ],
    });

    console.log("✅ Vested amount calculated:", vestedAmountInfo);

    return {
      vestedAmount: vestedAmountInfo[0] as bigint,
      totalVestedAmount: vestedAmountInfo[1] as bigint,
    };
  } catch (error) {
    console.error("❌ Error calculating vested amount:", error);
    return null;
  }
};

/**
 * Get comprehensive vesting progress for an escrow (untuk Sender Dashboard)
 * @param escrowId - ID escrow
 * @param tokenType - Jenis token
 */
export const getEscrowVestingProgress = async (
  escrowId: string,
  tokenType: TokenType,
): Promise<VestingProgressSummary | null> => {
  try {
    console.log("🔍 Getting escrow vesting progress:", { escrowId, tokenType });

    // Get basic vesting info
    const vestingInfo = await getEscrowVestingInfo(escrowId, tokenType);
    if (!vestingInfo) {
      console.log("⚠️ No vesting info found for escrow");
      return null;
    }

    // Get escrow details untuk mendapatkan receivers
    const escrowDetails = await getEscrowDetailsWithTokenDetection(escrowId);
    if (!escrowDetails) {
      console.log("⚠️ No escrow details found");
      return null;
    }

    const receivers = escrowDetails.receiverAddresses || [];

    // Get vesting info untuk setiap receiver
    const receiversVestingInfo = await Promise.all(
      receivers.map(async (receiverAddress: string) => {
        const receiverVesting = await getReceiverVestingInfo(
          escrowId,
          receiverAddress,
          tokenType,
        );

        // Get receiver details untuk allocation
        const contractAddress =
          tokenType === "IDRX"
            ? getEscrowAddress("IDRX")
            : getEscrowAddress("USDC");

        const abi =
          tokenType === "IDRX"
            ? escrowIdrxAbis
            : escrowAbis;

        let formattedEscrowId = escrowId;
        if (!escrowId.startsWith("0x")) {
          formattedEscrowId = "0x" + escrowId;
        }
        if (formattedEscrowId.length < 66) {
          formattedEscrowId = formattedEscrowId.padEnd(66, "0");
        }

        try {
          const receiverDetails = await publicClient.readContract({
            address: contractAddress as `0x${string}`,
            abi: abi,
            functionName: "getReceiverDetails",
            args: [
              formattedEscrowId as `0x${string}`,
              receiverAddress as `0x${string}`,
            ],
          });

          const allocation = receiverDetails[0] as bigint; // currentAllocation
          const withdrawnAmount = receiverDetails[1] as bigint; // withdrawnAmount

          return {
            address: receiverAddress,
            allocation: allocation,
            vestedAmount: receiverVesting?.vestedAmount || BigInt(0),
            claimedAmount: withdrawnAmount,
            availableToClaim: receiverVesting?.availableToClaim || BigInt(0),
            vestingProgress:
              Number(receiverVesting?.vestingProgress || BigInt(0)) / 100, // Convert from basis points to percentage
          };
        } catch (error) {
          console.error(
            `❌ Error getting details for receiver ${receiverAddress}:`,
            error,
          );
          return {
            address: receiverAddress,
            allocation: BigInt(0),
            vestedAmount: receiverVesting?.vestedAmount || BigInt(0),
            claimedAmount: BigInt(0),
            availableToClaim: receiverVesting?.availableToClaim || BigInt(0),
            vestingProgress:
              Number(receiverVesting?.vestingProgress || BigInt(0)) / 100,
          };
        }
      }),
    );

    // Calculate totals
    const totalAllocated = receiversVestingInfo.reduce(
      (sum, receiver) => sum + receiver.allocation,
      BigInt(0),
    );
    const totalVested = receiversVestingInfo.reduce(
      (sum, receiver) => sum + receiver.vestedAmount,
      BigInt(0),
    );
    const totalClaimed = receiversVestingInfo.reduce(
      (sum, receiver) => sum + receiver.claimedAmount,
      BigInt(0),
    );
    const remainingToVest = (
      totalAllocated >= totalVested ? totalAllocated - totalVested : BigInt(0)
    ) as bigint;

    // Calculate overall progress percentage
    const progressPercentage =
      totalAllocated > 0
        ? Number((totalVested * BigInt(100)) / totalAllocated)
        : 0;

    const summary: VestingProgressSummary = {
      escrowId,
      tokenType,
      vestingInfo,
      totalAllocated,
      totalVested,
      totalClaimed,
      remainingToVest,
      progressPercentage,
      receivers: receiversVestingInfo,
    };

    console.log("✅ Vesting progress summary:", summary);
    return summary;
  } catch (error) {
    console.error("❌ Error getting escrow vesting progress:", error);
    return null;
  }
};

/**
 * Check if an escrow has vesting enabled
 * @param escrowId - ID escrow
 * @param tokenType - Jenis token
 */
export const isVestingEnabled = async (
  escrowId: string,
  tokenType: TokenType,
): Promise<boolean> => {
  try {
    const vestingInfo = await getEscrowVestingInfo(escrowId, tokenType);
    return vestingInfo?.isVestingEnabled || false;
  } catch (error) {
    console.error("❌ Error checking if vesting is enabled:", error);
    return false;
  }
};

/**
 * Get vesting timeline information (untuk UI display)
 * @param escrowId - ID escrow
 * @param tokenType - Jenis token
 */
export const getVestingTimeline = async (
  escrowId: string,
  tokenType: TokenType,
): Promise<{
  startDate: Date;
  endDate: Date;
  currentDate: Date;
  durationDays: number;
  elapsedDays: number;
  remainingDays: number;
  progressPercentage: number;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
} | null> => {
  try {
    const vestingInfo = await getEscrowVestingInfo(escrowId, tokenType);
    if (!vestingInfo || !vestingInfo.isVestingEnabled) {
      return null;
    }

    const startTime = Number(vestingInfo.vestingStartTime);
    const duration = Number(vestingInfo.vestingDuration);
    const currentTime = Number(vestingInfo.currentTime);

    const startDate = new Date(startTime * 1000);
    const endDate = new Date((startTime + duration) * 1000);
    const currentDate = new Date(currentTime * 1000);

    const durationDays = Math.ceil(duration / (24 * 60 * 60));
    const elapsedSeconds = Math.max(0, currentTime - startTime);
    const elapsedDays = Math.floor(elapsedSeconds / (24 * 60 * 60));
    const remainingDays = Math.max(0, durationDays - elapsedDays);

    let progressPercentage = 0;
    let status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" = "NOT_STARTED";

    if (currentTime >= startTime + duration) {
      progressPercentage = 100;
      status = "COMPLETED";
    } else if (currentTime >= startTime) {
      progressPercentage = (elapsedSeconds / duration) * 100;
      status = "IN_PROGRESS";
    } else {
      progressPercentage = 0;
      status = "NOT_STARTED";
    }

    return {
      startDate,
      endDate,
      currentDate,
      durationDays,
      elapsedDays,
      remainingDays,
      progressPercentage: Math.min(100, Math.max(0, progressPercentage)),
      status,
    };
  } catch (error) {
    console.error("❌ Error getting vesting timeline:", error);
    return null;
  }
};

/**
 * Format vesting amount for display (dengan decimals yang tepat)
 * @param amount - Amount dalam BigInt
 * @param tokenType - Jenis token untuk menentukan decimals
 */
export const formatVestingAmount = (
  amount: bigint,
  tokenType: TokenType,
): string => {
  try {
    // Gunakan konfigurasi token yang terpusat (fully dynamic)
    const decimals = getTokenDecimals(tokenType);

    // Convert BigInt to string untuk avoid precision loss
    const amountStr = amount.toString();

    if (amountStr === "0") {
      return "0.0";
    }

    if (amountStr.length <= decimals) {
      // Amount kurang dari 1 unit
      const paddedAmount =
        "0".repeat(decimals + 1 - amountStr.length) + amountStr;
      const integerPart = paddedAmount.slice(0, -decimals) || "0";
      const decimalPart = paddedAmount.slice(-decimals);
      return `${integerPart}.${decimalPart}`;
    } else {
      // Amount 1 unit atau lebih
      const integerPart = amountStr.slice(0, -decimals);
      const decimalPart = amountStr.slice(-decimals);
      return `${integerPart}.${decimalPart}`;
    }
  } catch (error) {
    console.error("Error formatting vesting amount:", error);
    return "0.0";
  }
};
