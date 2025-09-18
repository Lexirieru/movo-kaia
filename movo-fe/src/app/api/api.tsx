import { GroupOfUser } from "@/types/receiverInGroupTemplate";
import axios, { AxiosError } from "axios";
interface ErrorResponse {
  message?: string;
}
const GOLDSKY_API_URL = process.env.NEXT_PUBLIC_GOLDSKY_API_URL || "https://api.goldsky.com/api/public/project_cmfnod75l9o1r01xy81lz52hq/subgraphs/test-escrow-movo/1.0.0/gn";

console.log("🔧 Goldsky API URL:", GOLDSKY_API_URL);

// Test function to verify Goldsky API is working
export const testGoldskyConnection = async () => {
  try {
    console.log("🧪 Testing Goldsky connection...");
    
    const testQuery = `
      query TestQuery {
        escrowCreateds(first: 1) {
          escrowId
          sender
        }
      }
    `;
    
    const response = await axios.post(GOLDSKY_API_URL, {
      query: testQuery,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    
    console.log("✅ Goldsky connection test successful:", response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("❌ Goldsky connection test failed:", error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,
});

// Function to query tokenWithdrawnToFiat from Goldsky
export const fetchTokenWithdrawnToFiat = async (receiver: string) => {
  try {
    console.log("🔍 Fetching tokenWithdrawnToFiat for receiver:", receiver);

    const query = `
      query FetchTokenWithdrawnToFiat($receiver: String!) {
        tokenWithdrawnToFiat(receiver: $receiver) {
          block_number
          amount
          contractId_
          depositWallet
          escrowId
          id
          receiver
          timestamp_
          transactionHash_
        }
      }
    `;

    const response = await axios.post(GOLDSKY_API_URL, {
      query,
      variables: { receiver },
    });

    if (response.data.errors) {
      console.error("❌ GraphQL errors:", response.data.errors);
      throw new Error(
        `GraphQL errors: ${JSON.stringify(response.data.errors)}`,
      );
    }

    console.log("✅ TokenWithdrawnToFiat data fetched:", response.data.data);
    return response.data.data.tokenWithdrawnToFiat || [];
  } catch (error) {
    console.error("❌ Error fetching tokenWithdrawnToFiat:", error);
    throw error;
  }
};

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

// buat senderdashboard
export const fetchEscrowsFromIndexer = async (userAddress: string) => {
  try {
    console.log("🔍 Fetching escrows for address:", userAddress);
    console.log("🔍 Address validation:", {
      address: userAddress,
      length: userAddress?.length,
      startsWith0x: userAddress?.startsWith('0x'),
      isLowerCase: userAddress === userAddress?.toLowerCase()
    });

    // const query = `
    //   query GetUserEscrows($userAddress: String!) {
    //     escrowCreateds(where: { sender: $userAddress }) {
    //       escrowId
    //       sender
    //       receivers
    //       totalAmount
    //       amounts
    //       block_number
    //       timestamp_
    //       transactionHash_
    //     }
    //   }
    // `;
    const query = `
      query GetUserEscrows($userAddress: String!) {
        escrowCreateds(
          where: { sender: $userAddress }
          orderBy: timestamp_
          orderDirection: desc
        ) {
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
      }
    `;
    
    console.log("📤 Sending GraphQL query to Goldsky...");
    console.log("📤 Query variables:", { userAddress });
    
    const response = await axios.post(GOLDSKY_API_URL, {
      query,
      variables: { userAddress: userAddress.toLowerCase() }, // Ensure lowercase
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    console.log("📥 Goldsky API response:", response.data);
    console.log("📥 Response status:", response.status);

    // Check for GraphQL errors
    if (response.data.errors) {
      console.error("❌ GraphQL errors:", response.data.errors);
      return [];
    }

    // Transform the data to match our expected format
    const escrows = response.data.data.escrowCreateds || [];
    console.log("📊 Raw escrows from indexer:", escrows);
    console.log("📊 Number of escrows found:", escrows.length);

    if (escrows.length === 0) {
      console.log("⚠️ No escrows found for address:", userAddress);
      return [];
    }

    const transformedEscrows = escrows.map((escrow: any, index: number) => {
            const tokenAddress = mapContractIdToTokenAddress(escrow.contractId_);

      // Parse timestamp if available
      const createdAt = escrow.timestamp_ 
        ? new Date(parseInt(escrow.timestamp_) * 1000).toISOString()
        : new Date().toISOString();

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
        tokenAddress: tokenAddress, // ini yang diedit tadinya pake address usdc langsung
        blockNumber: escrow.block_number,
        transactionHash: escrow.transactionHash_,
      };
    });

    console.log("✅ Transformed escrows:", transformedEscrows);
    return transformedEscrows;
  } catch (error) {
    console.error("❌ Error fetching escrows from indexer:", error);
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      userAddress,
      GOLDSKY_API_URL
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
    "EscrowContract": process.env.NEXT_PUBLIC_USDC_ADDRESS || "0xf9D5a610fe990bfCdF7dd9FD64bdfe89D6D1eb4c",
    
    // IDRX Contract  
    "EscrowIdrxContract": process.env.NEXT_PUBLIC_IDRX_ADDRESS || "0x77fEa84656B5EF40BF33e3835A9921dAEAadb976",
    
    // USDT Contract (if you have one)
    "EscrowUsdtContract": process.env.NEXT_PUBLIC_USDT_ADDRESS || "0x80327544e61e391304ad16f0BAFb2C5c7A76dfB3",
  };

  // Try exact match first
  if (contractMappings[contractId as keyof typeof contractMappings]) {
    const mappedAddress = contractMappings[contractId as keyof typeof contractMappings];
    console.log(`✅ Exact match: ${contractId} -> ${mappedAddress}`);
    return mappedAddress;
  }

  // Try pattern matching for contract addresses
  const lowerContractId = contractId?.toLowerCase() || "";
  
  if (lowerContractId.includes("idrx") || lowerContractId.includes("77fea84")) {
    console.log(`✅ Pattern match IDRX: ${contractId}`);
    return process.env.NEXT_PUBLIC_IDRX_ADDRESS || "0x77fEa84656B5EF40BF33e3835A9921dAEAadb976";
  }
  
  if (lowerContractId.includes("usdt") || lowerContractId.includes("80327544")) {
    console.log(`✅ Pattern match USDT: ${contractId}`);
    return process.env.NEXT_PUBLIC_USDT_ADDRESS || "0x80327544e61e391304ad16f0BAFb2C5c7A76dfB3";
  }

  // Default to USDC
  console.log(`⚠️ No match found for ${contractId}, defaulting to USDC`);
  return process.env.NEXT_PUBLIC_USDC_ADDRESS || "0xf9D5a610fe990bfCdF7dd9FD64bdfe89D6D1eb4c";
}

function determineTokenTypeFromContract(contractId: string): "USDC" | "USDT" | "IDRX" {
  const tokenAddress = mapContractIdToTokenAddress(contractId);
  
  const usdcAddress = (process.env.NEXT_PUBLIC_USDC_ADDRESS || "0xf9D5a610fe990bfCdF7dd9FD64bdfe89D6D1eb4c").toLowerCase();
  const usdtAddress = (process.env.NEXT_PUBLIC_USDT_ADDRESS || "0x80327544e61e391304ad16f0BAFb2C5c7A76dfB3").toLowerCase();
  const idrxAddress = (process.env.NEXT_PUBLIC_IDRX_ADDRESS || "0x77fEa84656B5EF40BF33e3835A9921dAEAadb976").toLowerCase();
  
  const addr = tokenAddress.toLowerCase();
  
  if (addr === idrxAddress) return "IDRX";
  if (addr === usdtAddress) return "USDT";
  return "USDC";
}

const fetchReceiverEscrowsFromIndexer = async (receiverAddress: string) => {
  try {
    console.log("🔍 Fetching receiver escrows for address:", receiverAddress);

    const query = `
      query GetReceiverEscrows($receiverAddress: String!) {
        escrowCreateds(where: {receivers_contains: $receiverAddress}) {
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
      }
    `;
    
    console.log("🔍 Receiver query variables:", { 
      receiverAddress: receiverAddress.toLowerCase(),
      originalAddress: receiverAddress 
    });

    const response = await axios.post(GOLDSKY_API_URL, {
      query,
      variables: {
        receiverAddress: receiverAddress.toLowerCase(),
      },
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    console.log("📥 Goldsky receiver API response:", response.data);
    console.log("📥 Receiver response status:", response.status);

    // Check for GraphQL errors
    if (response.data.errors) {
      console.error("❌ GraphQL errors in receiver query:", response.data.errors);
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
        const debugResponse = await axios.post(GOLDSKY_API_URL, {
          query: debugQuery,
        });
        console.log("🔍 Debug - Sample escrows:", debugResponse.data.data.escrowCreateds);
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
          receiverAddress: receiverAddress.toLowerCase()
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
          receiverAddress: receiverAddress.toLowerCase()
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
          originCurrency: "USDC", // Default to USDC, can be enhanced later

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
    console.log("✅ Available amounts:", transformedEscrows.map((e: any) => e.availableAmount));
    
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
        withdrawFundss(where: {recipient: $receiverAddress}) {
          escrowId
          recipient
          amount
          timestamp_
          transactionHash_
          block_number
        }
      }
    `;

    const response = await axios.post(GOLDSKY_API_URL, {
      query,
      variables: {
        receiverAddress: receiverAddress.toLowerCase(),
      },
    });

    console.log("📥 Goldsky withdraw events response:", response.data);

    const withdrawEvents = response.data.data.withdrawFunds || [];
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

// Calculate available withdrawals by comparing escrow created vs withdraw events
const calculateAvailableWithdrawals = async (receiverAddress: string) => {
  try {
    console.log("💰 Calculating available withdrawals for:", receiverAddress);

    // Fetch both escrow created events and withdraw events in parallel
    const [escrowEvents, withdrawEvents] = await Promise.all([
      fetchReceiverEscrowsFromIndexer(receiverAddress),
      fetchReceiverWithdrawEvents(receiverAddress),
    ]);

    console.log("📊 Processing escrow vs withdraw data...");
    console.log("📊 Escrow events:", escrowEvents.length);
    console.log("📊 Withdraw events:", withdrawEvents.length);

    // Create a map of withdrawn amounts per escrow
    const withdrawnAmounts: { [escrowId: string]: number } = {};
    withdrawEvents.forEach((withdraw: any) => {
      if (!withdrawnAmounts[withdraw.escrowId]) {
        withdrawnAmounts[withdraw.escrowId] = 0;
      }
      withdrawnAmounts[withdraw.escrowId] += parseFloat(withdraw.amount || "0");
    });

    console.log("📊 Withdrawn amounts map:", withdrawnAmounts);

    // Calculate available amounts
    const availableWithdrawals = escrowEvents
      .map((escrow: any) => {
        const allocatedAmount = parseFloat(escrow.availableAmount || "0");
        const withdrawnAmount = withdrawnAmounts[escrow.escrowId] || 0;
        const availableAmount = allocatedAmount - withdrawnAmount;

        console.log(`🔍 Processing withdrawal for escrow ${escrow.escrowId}:`, {
          allocatedAmount,
          withdrawnAmount,
          availableAmount,
          availableAmountString: escrow.availableAmount
        });

        return {
          ...escrow,
          allocatedAmount: allocatedAmount.toString(),
          withdrawnAmount: withdrawnAmount.toString(),
          availableAmount: Math.max(0, availableAmount).toString(), // Ensure non-negative
          hasWithdrawn: withdrawnAmount > 0,
        };
      })
      .filter((escrow: any) => parseFloat(escrow.availableAmount) > 0);

    console.log("📊 Available withdrawals after filtering:", availableWithdrawals.length);
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

    // Get calculated available withdrawals (includes escrow events)
    const withdrawalData = await calculateAvailableWithdrawals(receiverAddress);

    // Get additional withdraw history for analytics
    const withdrawHistory = await fetchReceiverWithdrawEvents(receiverAddress);

    return {
      // Main data for dashboard
      incomingTransactions: withdrawalData.availableWithdrawals,
      availableWithdrawals: withdrawalData.availableWithdrawals,
      totalAvailable: withdrawalData.totalAvailable,

      // Analytics data
      withdrawHistory,
      summary: withdrawalData.summary,

      // For backward compatibility
      escrowEvents: withdrawalData.availableWithdrawals,
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

    const response = await axios.post(GOLDSKY_API_URL, {
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
