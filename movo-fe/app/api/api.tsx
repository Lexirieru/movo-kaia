import { GroupOfUser } from "@/types/receiverInGroupTemplate";
import axios, { AxiosError } from "axios";

interface ErrorResponse {
  message?: string;
}

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
    const response = await api.post("/loginWithWallet", { walletAddress });
    return response.data;
  } catch (err) {
    console.log(err);
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
    const response = await api.put("/updateWalletAddressRole", {
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

export const addReceiverToGroup = async (
  senderId: string,
  originCurrency: string,
  tokenIcon: string,
  groupId: string,
  walletAddress: string,
  amount: string,
) => {
  try {
    const response = await api.post("/addReceiverToGroup", {
      senderId,
      originCurrency,
      tokenIcon,
      groupId,
      walletAddress,
      amount,
    });
    return response.data;
  } catch (err) {
    console.log(err);
  }
};

export const getEscrowId = async (_id: string, groupId: string) => {
  try {
    const response = await api.post("/getEscrowId", { _id, groupId });

    return response.data;
  } catch (err) {
    console.log(err);
  }
};

export const saveEscrowToDatabase = async (escrowData: {
  groupId: string;
  escrowId: string;
  originCurrency: "USDC" | "IDRX";
  walletAddress: string;
  totalAmount: string;
  receivers: Array<{
    address: string;
    fullname: string;
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
