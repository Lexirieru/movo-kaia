import { GroupOfUser } from "@/types/receiverInGroupTemplate";
import axios, { AxiosError } from "axios";
interface ErrorResponse {
  message?: string;
}
const GOLDSKY_API_URL = process.env.NEXT_PUBLIC_GOLDSKY_API_URL!;

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,
});

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
    const response = await api.post("/loadAllWithdrawHistory", {
      _id,
      walletAddress,
    });
    return response.data.data;
  } catch (err) {
    console.log(err);
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

export const fetchEscrowsFromIndexer = async (userAddress: string) => {
  try {
    console.log("🔍 Fetching escrows for address:", userAddress);

    const query = `
      query GetUserEscrows($userAddress: String!) {
        escrowCreateds(where: { sender: $userAddress }) {
          escrowId
          sender
          receivers
          totalAmount
          amounts
        }
      }
    `;
    console.log("📤 Sending GraphQL query to Goldsky...");
    const response = await axios.post(GOLDSKY_API_URL, {
      query,
      variables: { userAddress },
    });

    console.log("📥 Goldsky API response:", response.data);

    // Transform the data to match our expected format
    const escrows = response.data.data.escrowCreateds || [];
    console.log("📊 Raw escrows from indexer:", escrows);

    if (escrows.length === 0) {
      console.log("⚠️ No escrows found for address:", userAddress);
      return [];
    }

    const transformedEscrows = escrows.map((escrow: any, index: number) => ({
      id: `escrow-${index}`, // Generate ID since not available in indexer
      escrowId: escrow.escrowId,
      sender: escrow.sender,
      totalAmount: escrow.totalAmount || "0",
      createdAt: Math.floor(Date.now() / 1000).toString(), // Current timestamp as fallback
      receivers: escrow.receivers
        ? escrow.receivers.split(",").map((addr: string) => addr.trim())
        : [],
      amounts: escrow.amounts
        ? escrow.amounts.split(",").map((amount: string) => amount.trim())
        : [],
      tokenAddress: "0xf9D5a610fe990bfCdF7dd9FD64bdfe89D6D1eb4c", // Default to USDC for now
    }));

    console.log("✅ Transformed escrows:", transformedEscrows);
    return transformedEscrows;
  } catch (error) {
    console.error("❌ Error fetching escrows from indexer:", error);
    return [];
  }
};

export const fetchReceiverEscrowsFromIndexer = async (
  receiverAddress: string,
) => {
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

    const response = await axios.post(GOLDSKY_API_URL, {
      query,
      variables: {
        receiverAddress: receiverAddress.toLowerCase(),
      },
    });

    console.log("📥 Goldsky receiver API response:", response.data);

    // Transform the data to match our expected format
    const escrows = response.data.data.escrowCreateds || [];
    console.log("📊 Raw receiver escrows from indexer:", escrows);

    if (escrows.length === 0) {
      console.log("⚠️ No receiver escrows found for address:", receiverAddress);
      return [];
    }

    const transformedEscrows = escrows
      .map((escrow: any, index: number) => {
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
    return transformedEscrows;
  } catch (error) {
    console.error("❌ Error fetching receiver escrows from indexer:", error);
    return [];
  }
};

// Get withdraw events for a specific receiver from onchain data
export const fetchReceiverWithdrawEvents = async (receiverAddress: string) => {
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

    const withdrawEvents = response.data.data.withdrawFundss || [];
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
export const calculateAvailableWithdrawals = async (
  receiverAddress: string,
) => {
  try {
    console.log("💰 Calculating available withdrawals for:", receiverAddress);

    // Fetch both escrow created events and withdraw events in parallel
    const [escrowEvents, withdrawEvents] = await Promise.all([
      fetchReceiverEscrowsFromIndexer(receiverAddress),
      fetchReceiverWithdrawEvents(receiverAddress),
    ]);

    console.log("📊 Processing escrow vs withdraw data...");

    // Create a map of withdrawn amounts per escrow
    const withdrawnAmounts: { [escrowId: string]: number } = {};
    withdrawEvents.forEach((withdraw: any) => {
      if (!withdrawnAmounts[withdraw.escrowId]) {
        withdrawnAmounts[withdraw.escrowId] = 0;
      }
      withdrawnAmounts[withdraw.escrowId] += parseFloat(withdraw.amount || "0");
    });

    // Calculate available amounts
    const availableWithdrawals = escrowEvents
      .map((escrow: any) => {
        const allocatedAmount = parseFloat(escrow.availableAmount || "0");
        const withdrawnAmount = withdrawnAmounts[escrow.escrowId] || 0;
        const availableAmount = allocatedAmount - withdrawnAmount;

        return {
          ...escrow,
          allocatedAmount: allocatedAmount.toString(),
          withdrawnAmount: withdrawnAmount.toString(),
          availableAmount: Math.max(0, availableAmount).toString(), // Ensure non-negative
          hasWithdrawn: withdrawnAmount > 0,
        };
      })
      .filter((escrow: any) => parseFloat(escrow.availableAmount) > 0);

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
export const fetchOnchainReceiverDashboardData = async (
  receiverAddress: string,
) => {
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

export const fetchEscrowDetailsFromIndexer = async (escrowId: string) => {
  try {
    const query = `
      query GetEscrowDetails($escrowId: String!) {
        escrowCreateds(where: { escrowId: $escrowId }) {
          escrowId
          sender
          receivers
          totalAmount
          amounts
        }
      }
    `;

    const response = await axios.post(GOLDSKY_API_URL, {
      query,
      variables: { escrowId },
    });

    const escrow = response.data.data.escrowCreateds[0];
    if (!escrow) return null;

    // Transform the data to match our expected format
    return {
      id: `escrow-${escrowId}`, // Generate ID since not available in indexer
      escrowId: escrow.escrowId,
      sender: escrow.sender,
      totalAmount: escrow.totalAmount || "0",
      createdAt: Math.floor(Date.now() / 1000).toString(), // Current timestamp as fallback
      receivers: escrow.receivers
        ? escrow.receivers.split(",").map((addr: string) => addr.trim())
        : [],
      amounts: escrow.amounts
        ? escrow.amounts.split(",").map((amount: string) => amount.trim())
        : [],
      tokenAddress: "0xf9D5a610fe990bfCdF7dd9FD64bdfe89D6D1eb4c", // Default to USDC for now
    };
  } catch (error) {
    console.error("Error fetching escrow details from indexer:", error);
    return null;
  }
};

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

// ============= LEGACY BACKEND FUNCTIONS (DEPRECATED) =============
// These functions are kept for backward compatibility but should not be used
// All receiver functionality now uses onchain data only

export const getReceiverEscrowEvents_DEPRECATED = async (
  walletAddress: string,
): Promise<any> => {
  console.warn(
    "⚠️ Using deprecated backend API. Switch to onchain data fetching.",
  );
  try {
    const response = await api.post("/getReceiverEscrowEvents", {
      walletAddress,
    });
    return response.data;
  } catch (error) {
    console.error("❌ Error getting receiver escrow events:", error);
    throw error;
  }
};

export const getAvailableWithdrawals_DEPRECATED = async (
  walletAddress: string,
): Promise<any> => {
  console.warn(
    "⚠️ Using deprecated backend API. Switch to onchain data fetching.",
  );
  try {
    const response = await api.post("/getAvailableWithdrawals", {
      walletAddress,
    });
    return response.data;
  } catch (error) {
    console.error("❌ Error getting available withdrawals:", error);
    throw error;
  }
};

// ============= RECEIVER DASHBOARD API FUNCTIONS (ONCHAIN ONLY) =============

// Get receiver transaction statistics from onchain data
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

// Enhanced receiver dashboard data fetcher - now uses onchain data only
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
