"use client";

import { useState, useEffect } from "react";
import {
  Wallet,
  Users,
  DollarSign,
  Clock,
  ExternalLink,
  MoreVertical,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ArrowUp,
  X,
  Calendar,
  TrendingUp,
  Award,
} from "lucide-react";
import {
  escrowContract,
  escrowIdrxContract,
  usdcContract,
  usdtContract,
  idrxContract,
  parseTokenAmount,
  formatTokenAmount,
  topUpFunds,
  checkTokenBalance,
  checkTokenAllowance,
  approveTokens,
  closeEscrow,
} from "@/lib/smartContract";
import { getTokenAddress } from "@/lib/contractConfig";
import { useWallet } from "@/lib/walletContext";
import { useWalletClientHook } from "@/lib/useWalletClient";
import { Token } from "@/types";
import {
  getEscrowVestingInfo,
  getEscrowVestingProgress,
  getVestingTimeline,
  isVestingEnabled,
  formatVestingAmount,
  VestingInfo,
  VestingProgressSummary,
  TokenType,
} from "@/app/api/api";

interface EscrowData {
  id: string;
  escrowId: string;
  sender: string;
  totalAmount: string;
  createdAt: string;
  receivers: string[];
  amounts: string[];
  tokenAddress: string;
  tokenType?: TokenType;
  allocatedAmount?: string;
  depositedAmount?: string;
  withdrawnAmount?: string;
  availableBalance?: string;
  receiverCount?: string;
}

interface ContractDetails {
  escrowId: string;
  tokenType: TokenType;
  escrowRoom: {
    sender: string;
    totalAllocatedAmount: bigint;
    totalDepositedAmount: bigint;
    totalWithdrawnAmount: bigint;
    availableBalance: bigint;
    isActive: boolean;
    createdAt: bigint;
    lastTopUpAt: bigint;
    activeReceiverCount: number;
  };
  receivers: Array<{
    receiverAddress: string;
    currentAllocation: bigint;
    withdrawnAmount: bigint;
    isActive: boolean;
  }>;
  totalReceivers: number;
}

interface EscrowListProps {
  escrows: EscrowData[];
  onEscrowSelect: (escrowId: string) => void;
  isLoading: boolean;
  onEscrowDeleted: () => void;
  onTopupFund: (escrowId: string) => void;
}

const formatDate = (timestamp: string) => {
  const date = new Date(parseInt(timestamp) * 1000);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatAmount = (amount: string, tokenAddress: string) => {
  // Check if we have valid data
  if (!amount || amount === "0") {
    return "Amount not available";
  }

  // Determine token type based on address
  // const usdcAddress = getTokenAddress("USDC");
  // const usdtAddress = getTokenAddress("USDT");
  // const idrxAddress = getTokenAddress("IDRX");

  // Get token addresses for comparison
  const usdcAddress = getTokenAddress("USDC")?.toLowerCase();
  const usdtAddress = getTokenAddress("USDT")?.toLowerCase();
  const idrxBaseAddress = getTokenAddress("IDRX_BASE")?.toLowerCase();
  const idrxKaiaAddress = getTokenAddress("IDRX_KAIA")?.toLowerCase();
  // const usdcAddress = (
  //   process.env.NEXT_PUBLIC_USDC_ADDRESS ||
  //   "0xf9D5a610fe990bfCdF7dd9FD64bdfe89D6D1eb4c"
  // ).toLowerCase();
  // const usdtAddress = (
  //   process.env.NEXT_PUBLIC_USDT_ADDRESS ||
  //   "0x80327544e61e391304ad16f0BAFb2C5c7A76dfB3"
  // ).toLowerCase();
  // const idrxAddress = (
  //   process.env.NEXT_PUBLIC_IDRX_ADDRESS ||
  //   "0x77fEa84656B5EF40BF33e3835A9921dAEAadb976"
  // ).toLowerCase();

  let tokenSymbol = "USDC"; // Default to USDC
  let decimals = 6;
  const lowerTokenAddress = tokenAddress.toLowerCase();

  if (lowerTokenAddress === usdcAddress) {
    tokenSymbol = "USDC";
    decimals = 6;
  } else if (lowerTokenAddress === usdtAddress) {
    tokenSymbol = "USDT";
    decimals = 6;
  } else if (lowerTokenAddress === idrxBaseAddress) {
    tokenSymbol = "IDRX_BASE";
    decimals = 2;
  } else if (lowerTokenAddress === idrxKaiaAddress) {
    tokenSymbol = "IDRX_KAIA";
    decimals = 2;
  }

  const amountNumber = parseFloat(amount) / Math.pow(10, decimals);
  return `${amountNumber.toFixed(decimals === 6 ? 2 : 0)} ${tokenSymbol}`;
};

export default function EscrowList({
  escrows,
  onEscrowSelect,
  isLoading,
  onEscrowDeleted,
  onTopupFund,
}: EscrowListProps) {
  const { address, isConnected } = useWallet();
  const walletClient = useWalletClientHook();
  const [selectedEscrow, setSelectedEscrow] = useState<string | null>(null);
  const [expandedEscrows, setExpandedEscrows] = useState<Set<string>>(
    new Set(),
  );
  const [contractDetails, setContractDetails] = useState<
    Map<string, ContractDetails>
  >(new Map());
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set());

  // Vesting state
  const [vestingInfo, setVestingInfo] = useState<
    Map<string, VestingProgressSummary | null>
  >(new Map());
  const [vestingTimeline, setVestingTimeline] = useState<Map<string, any>>(
    new Map(),
  );
  const [loadingVesting, setLoadingVesting] = useState<Set<string>>(new Set());

  // Topup modal state
  const [topUpModal, setTopUpModal] = useState<{
    isOpen: boolean;
    escrowId: string;
    tokenAddress: string;
    tokenType: TokenType;
    maxAmount: string;
    maxAmountFormatted: string;
    tokenSymbol: string;
  } | null>(null);
  const [topUpAmount, setTopUpAmount] = useState<string>("");
  const [isTopUpLoading, setIsTopUpLoading] = useState(false);
  const [userTokenBalance, setUserTokenBalance] = useState<string>("0");
  const [closingEscrowId, setClosingEscrowId] = useState<string | null>(null);
  const [closeConfirmModal, setCloseConfirmModal] = useState<{
    isOpen: boolean;
    escrowId: string;
    tokenAddress: string;
    tokenType: TokenType;
  } | null>(null);
  // Auto-refresh vesting info for expanded escrows every 60 seconds
  useEffect(() => {
    if (expandedEscrows.size === 0) return;

    const interval = setInterval(() => {
      expandedEscrows.forEach((escrowId) => {
        const escrow = escrows.find((e) => e.escrowId === escrowId);
        if (
          escrow &&
          vestingInfo.has(escrowId) &&
          vestingInfo.get(escrowId) !== null
        ) {
          console.log("🔄 Auto-refreshing vesting info for:", escrowId);
          loadVestingInfo(escrowId, escrow.tokenAddress);
        }
      });
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [expandedEscrows, escrows, vestingInfo]);

  // Helper function to get token type based on token address
  const getTokenType = (tokenAddress: string): TokenType => {
    const usdcAddress = getTokenAddress("USDC");
    const usdtAddress = getTokenAddress("USDT");
    // const idrxAddress = getTokenAddress("IDRX");
    const idrxBaseAddress = getTokenAddress("IDRX_BASE");
    const idrxKaiaAddress = getTokenAddress("IDRX_KAIA");
    const addr = tokenAddress.toLowerCase();

    console.log("🔍 Token type detection:", {
      inputAddress: addr,
      usdcAddress: usdcAddress?.toLowerCase(),
      usdtAddress: usdtAddress?.toLowerCase(),
      idrxBaseAddress: idrxBaseAddress?.toLowerCase(),
      idrxKaiaAddress: idrxKaiaAddress?.toLowerCase(),
    });

    if (addr === usdcAddress?.toLowerCase()) {
      return "USDC";
    } else if (addr === usdtAddress?.toLowerCase()) {
      return "USDT";
    } else if (addr === idrxBaseAddress?.toLowerCase()) {
      return "IDRX_BASE";
    } else if (addr === idrxKaiaAddress?.toLowerCase()) {
      return "IDRX_KAIA";
    }
    return "USDC"; // Default
  };
  // if (tokenAddress.toLowerCase() === usdcAddress.toLowerCase()) {
  //   return "USDC";
  // } else if (tokenAddress.toLowerCase() === usdtAddress.toLowerCase()) {
  //   return "USDT";
  // } else if (tokenAddress.toLowerCase() === idrxAddress.toLowerCase()) {
  //   return "IDRX";
  // }

  // Helper function to get token symbol
  const getTokenSymbol = (tokenAddress: string): string => {
    const tokenType = getTokenType(tokenAddress);

    return tokenType; // Default
  };

  // Function to load vesting information
  const loadVestingInfo = async (escrowId: string, tokenAddress: string) => {
    if (vestingInfo.has(escrowId) || loadingVesting.has(escrowId)) {
      return;
    }

    setLoadingVesting((prev) => new Set(prev).add(escrowId));

    try {
      const tokenType = getTokenType(tokenAddress);

      // Check if vesting is enabled first
      const hasVesting = await isVestingEnabled(escrowId, tokenType);

      if (!hasVesting) {
        console.log("🔍 Vesting not enabled for escrow:", escrowId);
        setVestingInfo((prev) => new Map(prev).set(escrowId, null));
        setLoadingVesting((prev) => {
          const newSet = new Set(prev);
          newSet.delete(escrowId);
          return newSet;
        });
        return;
      }

      // Load vesting progress and timeline
      const [vestingProgress, timeline] = await Promise.all([
        getEscrowVestingProgress(escrowId, tokenType),
        getVestingTimeline(escrowId, tokenType),
      ]);

      console.log("✅ Vesting info loaded:", {
        escrowId,
        vestingProgress,
        timeline,
      });

      setVestingInfo((prev) => new Map(prev).set(escrowId, vestingProgress));
      setVestingTimeline((prev) => new Map(prev).set(escrowId, timeline));
    } catch (error) {
      console.error("❌ Error loading vesting info:", error);
      setVestingInfo((prev) => new Map(prev).set(escrowId, null));
    } finally {
      setLoadingVesting((prev) => {
        const newSet = new Set(prev);
        newSet.delete(escrowId);
        return newSet;
      });
    }
  };

  // Function to load contract details
  const loadContractDetails = async (
    escrowId: string,
    tokenAddress: string,
  ) => {
    if (contractDetails.has(escrowId) || loadingDetails.has(escrowId)) {
      return;
    }

    setLoadingDetails((prev) => new Set(prev).add(escrowId));

    const tokenType = getTokenType(tokenAddress);
    let contract;

    if (tokenType === "USDC" || tokenType === "USDT") {
      contract = escrowContract;
    } else {
      contract = escrowIdrxContract;
    }

    if (!contract) {
      console.error("❌ Contract not found for token type:", tokenType);
      setLoadingDetails((prev) => {
        const newSet = new Set(prev);
        newSet.delete(escrowId);
        return newSet;
      });
      return;
    }

    // Ensure escrowId is properly formatted as bytes32
    let formattedEscrowId = escrowId;
    if (!escrowId.startsWith("0x")) {
      formattedEscrowId = "0x" + escrowId;
    }

    // Pad to 32 bytes (64 hex characters + 0x prefix = 66 characters)
    if (formattedEscrowId.length < 66) {
      formattedEscrowId = formattedEscrowId.padEnd(66, "0");
    }

    console.log("🔍 Loading contract details for:", {
      escrowId,
      escrowIdType: typeof escrowId,
      escrowIdLength: escrowId?.length,
      tokenType,
      contractAddress: contract.address,
    });

    console.log("🔍 Formatted escrowId:", {
      original: escrowId,
      formatted: formattedEscrowId,
    });

    try {
      // Call getEscrowDetails directly on the contract
      const escrowDetails = await contract.read.getEscrowDetails([
        formattedEscrowId as `0x${string}`,
      ]);

      console.log("✅ Escrow details from contract:", escrowDetails);

      // Get receiver addresses
      const receiverAddresses = await contract.read.getEscrowReceivers([
        formattedEscrowId as `0x${string}`,
      ]);

      console.log("✅ Receiver addresses:", receiverAddresses);

      // Get receiver details for each address
      const receivers = [];
      for (const receiverAddress of receiverAddresses) {
        try {
          const receiverDetails = await contract.read.getReceiverDetails([
            formattedEscrowId as `0x${string}`,
            receiverAddress,
          ]);
          receivers.push({
            receiverAddress,
            currentAllocation: receiverDetails[0],
            withdrawnAmount: receiverDetails[1],
            isActive: receiverDetails[2],
          });
        } catch (receiverError) {
          console.warn(
            "Failed to get details for receiver:",
            receiverAddress,
            receiverError,
          );
        }
      }

      const details = {
        escrowId,
        tokenType,
        escrowRoom: {
          sender: escrowDetails[0],
          totalAllocatedAmount: escrowDetails[2],
          totalDepositedAmount: escrowDetails[3],
          totalWithdrawnAmount: escrowDetails[4],
          availableBalance: escrowDetails[5],
          isActive: true, // We'll assume active if we can read details
          createdAt: escrowDetails[6],
          lastTopUpAt: escrowDetails[7],
          activeReceiverCount: Number(escrowDetails[9]),
        },
        receivers,
        totalReceivers: receivers.length,
      };

      console.log("✅ Processed contract details:", details);
      setContractDetails((prev) => new Map(prev).set(escrowId, details));
    } catch (error) {
      console.error("❌ Failed to load contract details:", {
        error: error,
        escrowId: escrowId,
        formattedEscrowId: formattedEscrowId,
        tokenType: tokenType,
        contractAddress: contract?.address,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoadingDetails((prev) => {
        const newSet = new Set(prev);
        newSet.delete(escrowId);
        return newSet;
      });
    }
  };

  // Function to toggle details expansion
  const toggleDetails = (escrowId: string, tokenAddress: string) => {
    const newExpanded = new Set(expandedEscrows);
    if (newExpanded.has(escrowId)) {
      newExpanded.delete(escrowId);
    } else {
      newExpanded.add(escrowId);
      // Load contract details and vesting info when expanding
      loadContractDetails(escrowId, tokenAddress);
      loadVestingInfo(escrowId, tokenAddress);
    }
    setExpandedEscrows(newExpanded);
  };

  // Helper function to format token amount
  const formatTokenAmountLocal = (amount: string, tokenAddress: string) => {
    if (!amount || amount === "0") return "0.00";

    const tokenType = getTokenType(tokenAddress);

    let decimals = 6; // Default for USDC/USDT
    let displayDecimals = 2; // How many decimal places to show
    if (tokenType === "IDRX_BASE" || tokenType === "IDRX_KAIA") {
      decimals = 2;
      displayDecimals = 2;
    }

    // Handle large numbers by using string manipulation instead of parseFloat
    const amountStr = amount.toString();
    let formattedAmount;

    if (amountStr.length <= decimals) {
      // Amount is less than 1 unit
      const paddedAmount = amountStr.padStart(decimals + 1, "0");
      const integerPart = paddedAmount.slice(0, -decimals) || "0";
      const decimalPart = paddedAmount.slice(-decimals);
      formattedAmount = `${integerPart}.${decimalPart}`;
    } else {
      // Amount is 1 unit or more
      const integerPart = amountStr.slice(0, -decimals);
      const decimalPart = amountStr.slice(-decimals);
      formattedAmount = `${integerPart}.${decimalPart}`;
    }

    // Convert to number and format with proper decimal places
    const num = parseFloat(formattedAmount);
    return num.toFixed(displayDecimals);
  };

  // Helper function to format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(parseInt(timestamp) * 1000);
    return date.toLocaleString();
  };

  // Helper function to format address
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Function to open top up modal
  const openTopUpModal = async (escrowId: string, tokenAddress: string) => {
    const tokenType = getTokenType(tokenAddress);

    // Find the escrow data to get pre-fetched contract details
    const escrowData = escrows.find((escrow) => escrow.escrowId === escrowId);

    // Calculate max amount based on pre-fetched data
    // For top up, we can use a reasonable default since there's no hard limit in the contract
    // The actual limit will be the user's token balance
    let maxAmount = "1000000000000"; // Default max (1000 tokens with 6 decimals)

    // Use allocated amount as a reference, but allow topping up more
    if (escrowData?.allocatedAmount) {
      // Use allocated amount as a reasonable reference
      maxAmount = escrowData.allocatedAmount;
    } else if (escrowData?.totalAmount) {
      // Fallback to total amount from indexer
      maxAmount = escrowData.totalAmount;
    } else {
      // If no pre-fetched data, try to get it from contract details if available
      const details = contractDetails.get(escrowId);
      if (details?.escrowRoom?.totalAllocatedAmount) {
        maxAmount = details.escrowRoom.totalAllocatedAmount.toString();
      }
    }
    console.log("🔍 Max amount calculation debug:", {
      escrowData: escrowData
        ? {
            allocatedAmount: escrowData.allocatedAmount,
            totalAmount: escrowData.totalAmount,
          }
        : null,
      originalMaxAmount:
        escrowData?.allocatedAmount || escrowData?.totalAmount || "default",
      maxAmount: maxAmount,
    });

    // Get user's token balance
    const balance = await getUserTokenBalance(tokenType);
    const decimals =
      tokenType === "IDRX_BASE" || tokenType === "IDRX_KAIA" ? 2 : 6;
    const balanceFormatted = formatTokenAmount(balance, decimals);
    setUserTokenBalance(balanceFormatted);

    // Format max amount with proper decimals
    const maxAmountFormatted = formatTokenAmount(BigInt(maxAmount), decimals);
    const tokenSymbol = getTokenSymbol(tokenAddress);

    console.log("🚀 Opening top up modal with max amount:", {
      escrowId,
      tokenType,
      maxAmount,
      maxAmountFormatted,
      tokenSymbol,
      userBalance: balance.toString(),
      userBalanceFormatted: balanceFormatted,
      tokenAddress,
      decimals:
        tokenAddress.toLowerCase() ===
        "0x77fea84656b5ef40bf33e3835a9921daeaadb976"
          ? 2
          : 6,
      allocatedAmount: escrowData?.allocatedAmount,
      totalAmount: escrowData?.totalAmount,
      hasContractDetails: contractDetails.has(escrowId),
    });

    setTopUpModal({
      isOpen: true,
      escrowId,
      tokenAddress,
      tokenType: tokenType,
      // tokenType: tokenType as "USDC" | "IDRX",
      maxAmount,
      maxAmountFormatted,
      tokenSymbol,
    });
    setTopUpAmount("");
  };

  // Function to close top up modal
  const closeTopUpModal = () => {
    setTopUpModal(null);
    setTopUpAmount("");
  };

  // Function to get token contract based on token type
  const getTokenContract = (tokenType: TokenType) => {
    switch (tokenType) {
      case "USDC":
        return usdcContract;
      case "USDT":
        return usdtContract;
      case "IDRX_BASE":
      case "IDRX_KAIA":
        return idrxContract;
      default:
        return usdcContract;
    }
  };

  // Function to get escrow contract based on token type
  const getEscrowContract = (tokenType: TokenType) => {
    if (tokenType === "USDC" || tokenType === "USDT") {
      return escrowContract;
    } else if (tokenType === "IDRX_BASE" || tokenType === "IDRX_KAIA") {
      return escrowIdrxContract;
    }
    return escrowContract; // Default
  };

  // Function to get user's token balance
  const getUserTokenBalance = async (tokenType: TokenType) => {
    if (!address) return BigInt(0);

    try {
      const tokenContract = getTokenContract(tokenType);
      const balance = await tokenContract.read.balanceOf([
        address as `0x${string}`,
      ]);
      return balance;
    } catch (error) {
      console.error("Failed to get token balance:", error);
      return BigInt(0);
    }
  };

  // Function to handle top up transaction
  const handleTopUp = async () => {
    if (!topUpModal || !address || !isConnected || !walletClient) return;

    setIsTopUpLoading(true);

    try {
      const { escrowId, tokenAddress, tokenType } = topUpModal;
      const amount = parseFloat(topUpAmount);

      if (isNaN(amount) || amount <= 0) {
        alert("Please enter a valid amount");
        return;
      }

      // Check if amount exceeds max
      const maxAmountNumber = parseFloat(topUpModal.maxAmountFormatted);
      const userBalanceNumber = parseFloat(userTokenBalance);
      const actualMax = Math.min(maxAmountNumber, userBalanceNumber);

      if (amount > actualMax) {
        alert(
          `Amount cannot exceed maximum allowed: ${actualMax} ${topUpModal.tokenSymbol}`,
        );
        return;
      }

      console.log("🚀 Starting top up process:", {
        escrowId,
        tokenAddress,
        tokenType,
        tokenSymbol: topUpModal.tokenSymbol,
        amount,
        maxAmount: maxAmountNumber,
        userBalance: userBalanceNumber,
        actualMax,
      });

      // Convert amount to proper decimals using viem's parseUnits
      const decimals =
        tokenType === "IDRX_BASE" || tokenType === "IDRX_KAIA" ? 2 : 6;
      // const decimals = tokenType === "IDRX" ? 2 : 6;
      const amountInWei = parseTokenAmount(amount.toString(), decimals);

      console.log("💰 Amount in wei:", amountInWei.toString());

      // Check if user has enough balance
      const userBalance = await checkTokenBalance(tokenType, address);
      if (userBalance < amountInWei) {
        throw new Error(
          `Insufficient balance. You have ${formatTokenAmount(userBalance, decimals)} ${tokenType}`,
        );
      }

      // Check current allowance
      const currentAllowance = await checkTokenAllowance(
        tokenType,
        address,
        escrowId,
      );
      console.log("🔍 Current allowance:", currentAllowance.toString());

      // Approve tokens if needed
      if (currentAllowance < amountInWei) {
        console.log("🔐 Approving tokens...");

        const approvalSuccess = await approveTokens(
          walletClient,
          tokenType,
          escrowId,
          amountInWei,
        );

        if (!approvalSuccess) {
          throw new Error("Failed to approve tokens for escrow contract");
        }
      }

      // Perform topup using the smart contract function
      const result = await topUpFunds(
        walletClient,
        escrowId,
        amountInWei,
        tokenType,
      );

      if (result.success) {
        console.log("✅ Top up successful:", result.transactionHash);

        // Close modal and refresh data
        closeTopUpModal();

        // Refresh vesting info after topup
        const escrowData = escrows.find((e) => e.escrowId === escrowId);
        if (escrowData) {
          // Clear existing vesting cache and reload
          setVestingInfo((prev) => {
            const newMap = new Map(prev);
            newMap.delete(escrowId);
            return newMap;
          });
          setVestingTimeline((prev) => {
            const newMap = new Map(prev);
            newMap.delete(escrowId);
            return newMap;
          });

          // Reload vesting info
          setTimeout(() => {
            loadVestingInfo(escrowId, escrowData.tokenAddress);
          }, 1000);
        }

        // Call the parent's onTopupFund callback
        onTopupFund(escrowId);
      } else {
        throw new Error(result.error || "Failed to topup funds");
      }
    } catch (error) {
      console.error("❌ Top up failed:", error);
      alert(
        "Top up failed: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
    } finally {
      setIsTopUpLoading(false);
    }
  };

  const openCloseConfirmModal = (escrowId: string, tokenAddress: string) => {
    const tokenType = getTokenType(tokenAddress);
    setCloseConfirmModal({
      isOpen: true,
      escrowId,
      tokenAddress,
      tokenType,
    });
  };

  const closeCloseConfirmModal = () => {
    setCloseConfirmModal(null);
  };

  const handleCloseEscrow = async () => {
    if (!closeConfirmModal || !address || !isConnected || !walletClient) return;

    setClosingEscrowId(closeConfirmModal.escrowId);
    try {
      const { escrowId, tokenType } = closeConfirmModal;
      console.log("starting escrow closure process");

      const result = await closeEscrow(walletClient, tokenType, escrowId);
      if (result.success) {
        console.log("escrow closure successful:", result.transactionHash);

        closeCloseConfirmModal();
        onEscrowDeleted();
        alert("Escrow close successfully");
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error("Escrow closure failed", err);
      let errorMessage = err instanceof Error ? err.message : "Unknown error";

      // Provide more helpful error messages
      if (errorMessage.includes("remaining balance")) {
        errorMessage =
          "Cannot close escrow with remaining balance. Please withdraw all funds first or ensure all receivers have claimed their allocations.";
      } else if (errorMessage.includes("unclaimed allocation")) {
        errorMessage =
          "Cannot close escrow while receivers still have unclaimed allocations. Please ensure all allocations are claimed first.";
      } else if (errorMessage.includes("Only the escrow sender")) {
        errorMessage = "Only the escrow creator can close this escrow.";
      }

      alert(`❌ Error: ${errorMessage}`);
    } finally {
      setClosingEscrowId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-white/5 border border-white/10 rounded-xl p-6 animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-white/20 rounded w-32"></div>
                <div className="h-3 bg-white/10 rounded w-24"></div>
              </div>
              <div className="h-8 bg-white/20 rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (escrows.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-8 h-8 text-white/40" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">
          No Escrows Found
        </h3>
        <p className="text-white/60 mb-6">
          You haven't created any escrows yet. Create your first escrow to get
          started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {escrows.map((escrow) => {
        const isExpanded = expandedEscrows.has(escrow.escrowId);
        const details = contractDetails.get(escrow.escrowId);
        const isLoadingDetails = loadingDetails.has(escrow.escrowId);
        const escrowVestingInfo = vestingInfo.get(escrow.escrowId);
        const escrowVestingTimeline = vestingTimeline.get(escrow.escrowId);
        const isLoadingVesting = loadingVesting.has(escrow.escrowId);

        return (
          <div
            key={escrow.id}
            className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-200 group"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Escrow #{escrow.escrowId.slice(0, 8)}...
                    </h3>
                    <p className="text-white/60 text-sm">
                      Created {formatDate(escrow.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-white/60" />
                    <span className="text-white/80 text-sm">
                      {escrow.receivers.length} Receivers
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-white/60" />
                    <span className="text-white/80 text-sm">
                      {formatAmount(escrow.totalAmount, escrow.tokenAddress)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-white/60" />
                    <span className="text-white/80 text-sm">Active</span>
                    {escrowVestingInfo && (
                      <div className="flex items-center space-x-1 ml-2">
                        <Calendar className="w-3 h-3 text-orange-400" />
                        <span className="text-orange-400 text-xs font-medium">
                          Vesting
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() =>
                    openTopUpModal(escrow.escrowId, escrow.tokenAddress)
                  }
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-green-500/25 transition-all duration-200 flex items-center space-x-2"
                >
                  <ArrowUp className="w-4 h-4" />
                  <span>Top Up</span>
                </button>

                <button
                  onClick={() =>
                    toggleDetails(escrow.escrowId, escrow.tokenAddress)
                  }
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-200 flex items-center space-x-2"
                >
                  {isLoadingDetails ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  <span>Details</span>
                </button>

                <div className="relative">
                  <button
                    onClick={() =>
                      setSelectedEscrow(
                        selectedEscrow === escrow.escrowId
                          ? null
                          : escrow.escrowId,
                      )
                    }
                    className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {selectedEscrow === escrow.escrowId && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 border border-white/10 rounded-lg shadow-xl z-10">
                      <button
                        onClick={() => {
                          onTopupFund(escrow.escrowId);
                          setSelectedEscrow(null);
                        }}
                        className="w-full px-4 py-3 text-left text-white hover:bg-white/10 flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Top Up Funds</span>
                      </button>
                      <button
                        onClick={() => {
                          openCloseConfirmModal(
                            escrow.escrowId,
                            escrow.tokenAddress,
                          );
                          setSelectedEscrow(null);
                        }}
                        disabled={closingEscrowId === escrow.escrowId}
                        className={`w-full px-4 py-3 text-left flex items-center space-x-3 transition-colors ${
                          closingEscrowId === escrow.escrowId
                            ? "cursor-not-allowed opacity-50"
                            : "hover:bg-red-500/10"
                        }`}
                      >
                        <div className="p-1 bg-red-500/20 rounded">
                          {closingEscrowId === escrow.escrowId ? (
                            <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <X className="w-3 h-3 text-red-400" />
                          )}
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${
                            closingEscrowId === escrow.escrowId ? "text-red-600" : "text-red-400"
                          }`}>
                            {closingEscrowId === escrow.escrowId ? "Closing..." : "Close Escrow"}
                          </p>
                          <p className="text-xs text-red-400/60">Permanently close this escrow</p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Expandable Details Section */}
            {isExpanded && (
              <div className="mt-6 pt-6 border-t border-white/10">
                {isLoadingDetails ? (
                  <div className="flex items-center justify-center space-x-3 py-8">
                    <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                    <span className="text-white/60">
                      Loading contract details...
                    </span>
                  </div>
                ) : details ? (
                  <div className="space-y-6">
                    {/* Contract Details Header */}
                    <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-4">
                      <h4 className="text-lg font-semibold text-white mb-4">
                        Contract Details
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <p className="text-white/60 text-sm">
                              Sender Address
                            </p>
                            <p className="text-white font-mono text-sm">
                              {formatAddress(details.escrowRoom.sender)}
                            </p>
                          </div>
                          <div>
                            <p className="text-white/60 text-sm">Token Type</p>
                            <p className="text-white font-semibold">
                              {details.tokenType}
                            </p>
                          </div>
                          <div>
                            <p className="text-white/60 text-sm">Created At</p>
                            <p className="text-white text-sm">
                              {formatTimestamp(
                                details.escrowRoom.createdAt.toString(),
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-white/60 text-sm">Last Top Up</p>
                            <p className="text-white text-sm">
                              {formatTimestamp(
                                details.escrowRoom.lastTopUpAt.toString(),
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <p className="text-white/60 text-sm">
                              Total Allocated
                            </p>
                            <p className="text-white font-semibold">
                              {formatTokenAmount(
                                details.escrowRoom.totalAllocatedAmount,
                                details.tokenType === "IDRX_BASE" ||
                                  details.tokenType === "IDRX_KAIA"
                                  ? 2
                                  : 6,
                                // escrow.tokenType === "IDRX" ? 2 : 6,
                              )}{" "}
                              tokens
                            </p>
                          </div>
                          <div>
                            <p className="text-white/60 text-sm">
                              Total Deposited
                            </p>
                            <p className="text-white font-semibold">
                              {formatTokenAmount(
                                details.escrowRoom.totalDepositedAmount,
                                details.tokenType === "IDRX_BASE" ||
                                  details.tokenType === "IDRX_KAIA"
                                  ? 2
                                  : 6,
                                // escrow.tokenType === "IDRX" ? 2 : 6,
                              )}{" "}
                              tokens
                            </p>
                          </div>
                          <div>
                            <p className="text-white/60 text-sm">
                              Total Withdrawn
                            </p>
                            <p className="text-white font-semibold">
                              {formatTokenAmount(
                                details.escrowRoom.totalWithdrawnAmount,
                                details.tokenType === "IDRX_BASE" ||
                                  details.tokenType === "IDRX_KAIA"
                                  ? 2
                                  : 6,
                                // escrow.tokenType === "IDRX" ? 2 : 6,
                              )}{" "}
                              {details.tokenType}
                            </p>
                          </div>
                          <div>
                            <p className="text-white/60 text-sm">
                              Available Balance
                            </p>
                            <p className="text-green-400 font-semibold">
                              {formatTokenAmount(
                                details.escrowRoom.availableBalance,
                                details.tokenType === "IDRX_BASE" ||
                                  details.tokenType === "IDRX_KAIA"
                                  ? 2
                                  : 6,
                                // escrow.tokenType === "IDRX" ? 2 : 6,
                              )}{" "}
                              {details.tokenType}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Receiver Information */}
                    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
                      <h4 className="text-lg font-semibold text-white mb-4">
                        Receiver Information
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-white/60 text-sm">
                            Total Receivers
                          </p>
                          <p className="text-white font-semibold">
                            {details.totalReceivers}
                          </p>
                        </div>
                        <div>
                          <p className="text-white/60 text-sm">
                            Active Receivers
                          </p>
                          <p className="text-white font-semibold">
                            {details.escrowRoom.activeReceiverCount}
                          </p>
                        </div>
                      </div>

                      {details.receivers && details.receivers.length > 0 && (
                        <div>
                          <p className="text-white/60 text-sm mb-2">
                            Receiver Details
                          </p>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {details.receivers.map((receiver, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-2 bg-white/5 rounded-lg"
                              >
                                <div className="flex items-center space-x-2">
                                  <span className="text-purple-400 text-sm font-medium">
                                    {index + 1}.
                                  </span>
                                  <span className="text-white font-mono text-sm">
                                    {formatAddress(receiver.receiverAddress)}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <div className="text-white text-xs">
                                    Allocated:{" "}
                                    {formatTokenAmount(
                                      receiver.currentAllocation,
                                      details.tokenType === "IDRX_BASE" ||
                                        details.tokenType === "IDRX_KAIA"
                                        ? 2
                                        : 6,
                                      // escrow.tokenType === "IDRX" ? 2 : 6,
                                    )}
                                  </div>
                                  <div className="text-white/60 text-xs">
                                    Withdrawn:{" "}
                                    {formatTokenAmount(
                                      receiver.withdrawnAmount,
                                      details.tokenType === "IDRX_BASE" ||
                                        details.tokenType === "IDRX_KAIA"
                                        ? 2
                                        : 6,
                                      // escrow.tokenType === "IDRX" ? 2 : 6,
                                    )}
                                  </div>
                                  <div
                                    className={`text-xs ${receiver.isActive ? "text-green-400" : "text-red-400"}`}
                                  >
                                    {receiver.isActive ? "Active" : "Inactive"}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Vesting Information */}
                    {(escrowVestingInfo !== undefined || isLoadingVesting) && (
                      <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-xl p-4">
                        <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                          <Calendar className="w-5 h-5 text-orange-400" />
                          <span>Vesting Information</span>
                        </h4>

                        {isLoadingVesting ? (
                          <div className="flex items-center justify-center space-x-3 py-4">
                            <RefreshCw className="w-5 h-5 animate-spin text-orange-400" />
                            <span className="text-white/60">
                              Loading vesting info...
                            </span>
                          </div>
                        ) : escrowVestingInfo ? (
                          <div className="space-y-4">
                            {/* Vesting Timeline */}
                            {escrowVestingTimeline && (
                              <div className="bg-white/5 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-white/60 text-sm">
                                    Vesting Status
                                  </span>
                                  <span
                                    className={`text-sm font-medium px-2 py-1 rounded-full ${
                                      escrowVestingTimeline.status ===
                                      "COMPLETED"
                                        ? "bg-green-500/20 text-green-400"
                                        : escrowVestingTimeline.status ===
                                            "IN_PROGRESS"
                                          ? "bg-orange-500/20 text-orange-400"
                                          : "bg-gray-500/20 text-gray-400"
                                    }`}
                                  >
                                    {escrowVestingTimeline.status.replace(
                                      "_",
                                      " ",
                                    )}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="text-white/60">Start Date</p>
                                    <p className="text-white">
                                      {escrowVestingTimeline.startDate?.toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-white/60">End Date</p>
                                    <p className="text-white">
                                      {escrowVestingTimeline.endDate?.toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-white/60">Duration</p>
                                    <p className="text-white">
                                      {escrowVestingTimeline.durationDays} days
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-white/60">Remaining</p>
                                    <p className="text-white">
                                      {escrowVestingTimeline.remainingDays} days
                                    </p>
                                  </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mt-3">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-white/60 text-xs">
                                      Time Progress
                                    </span>
                                    <span className="text-white text-xs">
                                      {escrowVestingTimeline.progressPercentage.toFixed(
                                        1,
                                      )}
                                      %
                                    </span>
                                  </div>
                                  <div className="w-full bg-white/10 rounded-full h-2">
                                    <div
                                      className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full transition-all duration-300"
                                      style={{
                                        width: `${Math.min(100, Math.max(0, escrowVestingTimeline.progressPercentage))}%`,
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Vesting Financial Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <div className="bg-white/5 rounded-lg p-3">
                                  <p className="text-white/60 text-sm">
                                    Total Allocated
                                  </p>
                                  <p className="text-white font-semibold">
                                    {formatVestingAmount(
                                      escrowVestingInfo.totalAllocated,
                                      escrowVestingInfo.tokenType,
                                    )}{" "}
                                    {escrowVestingInfo.tokenType}
                                  </p>
                                </div>
                                <div className="bg-white/5 rounded-lg p-3">
                                  <p className="text-white/60 text-sm">
                                    Total Vested
                                  </p>
                                  <p className="text-orange-400 font-semibold">
                                    {formatVestingAmount(
                                      escrowVestingInfo.totalVested,
                                      escrowVestingInfo.tokenType,
                                    )}{" "}
                                    {escrowVestingInfo.tokenType}
                                  </p>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <div className="bg-white/5 rounded-lg p-3">
                                  <p className="text-white/60 text-sm">
                                    Total Claimed
                                  </p>
                                  <p className="text-green-400 font-semibold">
                                    {formatVestingAmount(
                                      escrowVestingInfo.totalClaimed,
                                      escrowVestingInfo.tokenType,
                                    )}{" "}
                                    {escrowVestingInfo.tokenType}
                                  </p>
                                </div>
                                <div className="bg-white/5 rounded-lg p-3">
                                  <p className="text-white/60 text-sm">
                                    Remaining to Vest
                                  </p>
                                  <p className="text-blue-400 font-semibold">
                                    {formatVestingAmount(
                                      escrowVestingInfo.remainingToVest,
                                      escrowVestingInfo.tokenType,
                                    )}{" "}
                                    {escrowVestingInfo.tokenType}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Overall Vesting Progress */}
                            <div className="bg-white/5 rounded-lg p-3">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-white/60 text-sm flex items-center space-x-2">
                                  <TrendingUp className="w-4 h-4" />
                                  <span>Overall Vesting Progress</span>
                                </span>
                                <span className="text-white font-semibold">
                                  {escrowVestingInfo.progressPercentage.toFixed(
                                    1,
                                  )}
                                  %
                                </span>
                              </div>
                              <div className="w-full bg-white/10 rounded-full h-3">
                                <div
                                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300"
                                  style={{
                                    width: `${Math.min(100, Math.max(0, escrowVestingInfo.progressPercentage))}%`,
                                  }}
                                ></div>
                              </div>
                            </div>

                            {/* Receiver Vesting Details */}
                            {escrowVestingInfo.receivers &&
                              escrowVestingInfo.receivers.length > 0 && (
                                <div>
                                  <h5 className="text-white font-medium mb-2 flex items-center space-x-2">
                                    <Award className="w-4 h-4 text-purple-400" />
                                    <span>Receiver Vesting Progress</span>
                                  </h5>
                                  <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {escrowVestingInfo.receivers.map(
                                      (receiver, index) => (
                                        <div
                                          key={index}
                                          className="bg-white/5 rounded-lg p-3"
                                        >
                                          <div className="flex items-center justify-between mb-2">
                                            <span className="text-white font-mono text-sm">
                                              {formatAddress(receiver.address)}
                                            </span>
                                            <span className="text-purple-400 text-sm font-medium">
                                              {receiver.vestingProgress.toFixed(
                                                1,
                                              )}
                                              %
                                            </span>
                                          </div>

                                          <div className="grid grid-cols-3 gap-2 text-xs">
                                            <div>
                                              <p className="text-white/60">
                                                Allocated
                                              </p>
                                              <p className="text-white">
                                                {formatVestingAmount(
                                                  receiver.allocation,
                                                  escrowVestingInfo.tokenType,
                                                )}
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-white/60">
                                                Vested
                                              </p>
                                              <p className="text-orange-400">
                                                {formatVestingAmount(
                                                  receiver.vestedAmount,
                                                  escrowVestingInfo.tokenType,
                                                )}
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-white/60">
                                                Available
                                              </p>
                                              <p className="text-green-400">
                                                {formatVestingAmount(
                                                  receiver.availableToClaim,
                                                  escrowVestingInfo.tokenType,
                                                )}
                                              </p>
                                            </div>
                                          </div>

                                          {/* Individual Progress Bar */}
                                          <div className="mt-2">
                                            <div className="w-full bg-white/10 rounded-full h-1.5">
                                              <div
                                                className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full transition-all duration-300"
                                                style={{
                                                  width: `${Math.min(100, Math.max(0, receiver.vestingProgress))}%`,
                                                }}
                                              ></div>
                                            </div>
                                          </div>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </div>
                              )}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <div className="w-12 h-12 bg-gray-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                              <Calendar className="w-6 h-6 text-gray-400" />
                            </div>
                            <p className="text-gray-400 text-sm">
                              No vesting configured for this escrow
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => onEscrowSelect(escrow.escrowId)}
                        className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-green-500/25 transition-all duration-200 flex items-center space-x-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>View Full Details</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-8 h-8 text-red-400" />
                    </div>
                    <p className="text-red-400 font-medium">
                      Failed to load contract details
                    </p>
                    <p className="text-white/60 text-sm mt-2">
                      Please try again later
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Topup Modal */}
      {topUpModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900/95 border border-cyan-400/20 rounded-2xl w-full max-w-md">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <div>
                <h3 className="text-white text-xl font-semibold">
                  Topup Funds
                </h3>
                <p className="text-white/60 text-sm">
                  Add more {topUpModal.tokenSymbol} to your escrow
                </p>
              </div>
              <button
                onClick={closeTopUpModal}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Escrow Info */}
              <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-4">
                <h4 className="text-cyan-300 font-medium mb-2">
                  Escrow Details
                </h4>
                <div className="space-y-1 text-sm">
                  <p className="text-white/60">
                    Escrow ID:{" "}
                    <span className="text-white font-mono">
                      {topUpModal.escrowId.slice(0, 8)}...
                    </span>
                  </p>
                  <p className="text-white/60">
                    Token:{" "}
                    <span className="text-white font-medium">
                      {topUpModal.tokenSymbol}
                    </span>
                  </p>
                  <p className="text-white/60">
                    Your Balance:{" "}
                    <span className="text-white font-medium">
                      {userTokenBalance} {topUpModal.tokenSymbol}
                    </span>
                  </p>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Amount to Topup ({topUpModal.tokenSymbol})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    // step="0.01"
                    min="0"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all pr-20"
                    disabled={isTopUpLoading}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 text-sm">
                    {topUpModal.tokenSymbol}
                  </div>
                </div>
                <p className="text-white/60 text-xs mt-1">
                  Max: {topUpModal.maxAmountFormatted} {topUpModal.tokenSymbol}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={closeTopUpModal}
                  className="flex-1 px-4 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                  disabled={isTopUpLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleTopUp}
                  disabled={
                    isTopUpLoading ||
                    !topUpAmount ||
                    parseFloat(topUpAmount) <= 0 ||
                    !walletClient ||
                    !isConnected
                  }
                  className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
                    isTopUpLoading ||
                    !topUpAmount ||
                    parseFloat(topUpAmount) <= 0 ||
                    !walletClient ||
                    !isConnected
                      ? "bg-gray-500/50 text-gray-300 cursor-not-allowed"
                      : "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-500/25 hover:scale-105"
                  }`}
                >
                  {isTopUpLoading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <ArrowUp className="w-5 h-5" />
                      <span>
                        Topup {topUpAmount} {topUpModal.tokenSymbol}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {closeConfirmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900/95 border border-orange-400/20 rounded-2xl w-full max-w-md">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <div>
                <h3 className="text-white text-xl font-semibold">
                  Close Escrow
                </h3>
                <p className="text-orange-400 text-sm">
                  This action will close the escrow permanently
                </p>
              </div>
              <button
                onClick={closeCloseConfirmModal}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Warning Info */}
              <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-4">
                <h4 className="text-orange-300 font-medium mb-2">
                  ⚠️ Warning
                </h4>
                <div className="space-y-1 text-sm text-white/80">
                  <p>This will permanently close the escrow on the blockchain:</p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>Escrow will be marked as closed</li>
                    <li>No further operations allowed</li>
                    <li>Transaction history preserved</li>
                  </ul>
                  <p className="text-orange-400 font-medium mt-2">
                    Make sure all funds are withdrawn and all receivers have claimed their allocations.
                  </p>
                </div>
              </div>

              {/* Escrow Info */}
              <div className="bg-gradient-to-r from-gray-500/10 to-gray-600/10 border border-gray-500/20 rounded-xl p-4">
                <h4 className="text-gray-300 font-medium mb-2">
                  Escrow Details
                </h4>
                <div className="space-y-1 text-sm">
                  <p className="text-white/60">
                    Escrow ID:{" "}
                    <span className="text-white font-mono">
                      {closeConfirmModal.escrowId.slice(0, 8)}...
                    </span>
                  </p>
                  <p className="text-white/60">
                    Token:{" "}
                    <span className="text-white font-medium">
                      {closeConfirmModal.tokenType}
                    </span>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={closeCloseConfirmModal}
                  className="flex-1 px-4 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                  disabled={closingEscrowId === closeConfirmModal.escrowId}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCloseEscrow}
                  disabled={
                    closingEscrowId === closeConfirmModal.escrowId ||
                    !walletClient ||
                    !isConnected
                  }
                  className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
                    closingEscrowId === closeConfirmModal.escrowId ||
                    !walletClient ||
                    !isConnected
                      ? "bg-gray-500/50 text-gray-300 cursor-not-allowed"
                      : "bg-gradient-to-r from-orange-500 to-red-600 text-white hover:shadow-lg hover:shadow-orange-500/25 hover:scale-105"
                  }`}
                >
                  {closingEscrowId === closeConfirmModal.escrowId ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Closing...</span>
                    </>
                  ) : (
                    <>
                      <X className="w-5 h-5" />
                      <span>Close Escrow</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedEscrow && (
        <div 
          className="fixed inset-0 z-5" 
          onClick={() => setSelectedEscrow(null)}
        />
      )}
    </div>
  );
}
