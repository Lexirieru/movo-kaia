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
  X
} from "lucide-react";
import { escrowContract, escrowIdrxContract, usdcContract, usdtContract, idrxContract, parseTokenAmount, formatTokenAmount, topUpFunds, checkTokenBalance, checkTokenAllowance, approveTokens } from "@/lib/smartContract";
import { getTokenAddress } from "@/lib/contractConfig";
import { useWallet } from "@/lib/walletContext";
import { useWalletClientHook } from "@/lib/useWalletClient";

interface EscrowData {
  id: string;
  escrowId: string;
  sender: string;
  totalAmount: string;
  createdAt: string;
  receivers: string[];
  amounts: string[];
  tokenAddress: string;
  tokenType?: "USDC" | "IDRX";
  allocatedAmount?: string;
  depositedAmount?: string;
  withdrawnAmount?: string;
  availableBalance?: string;
  receiverCount?: string;
}

interface ContractDetails {
  escrowId: string;
  tokenType: "USDC" | "USDT" | "IDRX";
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
  const usdcAddress = getTokenAddress("USDC");
  const usdtAddress = getTokenAddress("USDT");
  const idrxAddress = getTokenAddress("IDRX");
  
  let tokenSymbol = "USDC"; // Default to USDC
  let decimals = 6;
  
  if (tokenAddress.toLowerCase() === usdcAddress.toLowerCase()) {
    tokenSymbol = "USDC";
    decimals = 6;
  } else if (tokenAddress.toLowerCase() === usdtAddress.toLowerCase()) {
    tokenSymbol = "USDT";
    decimals = 6;
  } else if (tokenAddress.toLowerCase() === idrxAddress.toLowerCase()) {
    tokenSymbol = "IDRX";
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
  const [expandedEscrows, setExpandedEscrows] = useState<Set<string>>(new Set());
  const [contractDetails, setContractDetails] = useState<Map<string, ContractDetails>>(new Map());
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set());
  
  // Topup modal state
  const [topUpModal, setTopUpModal] = useState<{
    isOpen: boolean;
    escrowId: string;
    tokenAddress: string;
    tokenType: "USDC" | "IDRX";
    maxAmount: string;
    maxAmountFormatted: string;
    tokenSymbol: string;
  } | null>(null);
  const [topUpAmount, setTopUpAmount] = useState<string>("");
  const [isTopUpLoading, setIsTopUpLoading] = useState(false);
  const [userTokenBalance, setUserTokenBalance] = useState<string>("0");

  // Helper function to get token type based on token address
  const getTokenType = (tokenAddress: string): "USDC" | "USDT" | "IDRX" => {
    const usdcAddress = getTokenAddress("USDC");
    const usdtAddress = getTokenAddress("USDT");
    const idrxAddress = getTokenAddress("IDRX");
    
    if (tokenAddress.toLowerCase() === usdcAddress.toLowerCase()) {
      return "USDC";
    } else if (tokenAddress.toLowerCase() === usdtAddress.toLowerCase()) {
      return "USDT";
    } else if (tokenAddress.toLowerCase() === idrxAddress.toLowerCase()) {
      return "IDRX";
    }
    return "USDC"; // Default
  };

  // Helper function to get token symbol
  const getTokenSymbol = (tokenAddress: string): string => {
    const usdcAddress = getTokenAddress("USDC");
    const usdtAddress = getTokenAddress("USDT");
    const idrxAddress = getTokenAddress("IDRX");
    
    if (tokenAddress.toLowerCase() === usdcAddress.toLowerCase()) {
      return "USDC";
    } else if (tokenAddress.toLowerCase() === usdtAddress.toLowerCase()) {
      return "USDT";
    } else if (tokenAddress.toLowerCase() === idrxAddress.toLowerCase()) {
      return "IDRX";
    }
    return "USDC"; // Default
  };

  // Function to load contract details
  const loadContractDetails = async (escrowId: string, tokenAddress: string) => {
    if (contractDetails.has(escrowId) || loadingDetails.has(escrowId)) {
      return;
    }

    setLoadingDetails(prev => new Set(prev).add(escrowId));
    
    const tokenType = getTokenType(tokenAddress);
    let contract;
    
    if (tokenType === "USDC") {
      contract = escrowContract;
    } else {
      contract = escrowIdrxContract;
    }

    // Ensure escrowId is properly formatted as bytes32
    let formattedEscrowId = escrowId;
    if (!escrowId.startsWith('0x')) {
      formattedEscrowId = '0x' + escrowId;
    }
    
    // Pad to 32 bytes (64 hex characters + 0x prefix = 66 characters)
    if (formattedEscrowId.length < 66) {
      formattedEscrowId = formattedEscrowId.padEnd(66, '0');
    }

    console.log("🔍 Loading contract details for:", { 
      escrowId, 
      escrowIdType: typeof escrowId,
      escrowIdLength: escrowId?.length,
      tokenType, 
      contractAddress: contract.address 
    });

    console.log("🔍 Formatted escrowId:", { original: escrowId, formatted: formattedEscrowId });
    
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
          console.warn("Failed to get details for receiver:", receiverAddress, receiverError);
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
      setContractDetails(prev => new Map(prev).set(escrowId, details));
      
    } catch (error) {
      console.error("❌ Failed to load contract details:", {
        error: error,
        escrowId: escrowId,
        formattedEscrowId: formattedEscrowId,
        tokenType: tokenType,
        contractAddress: contract?.address,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoadingDetails(prev => {
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
      // Load contract details when expanding
      loadContractDetails(escrowId, tokenAddress);
    }
    setExpandedEscrows(newExpanded);
  };

  // Helper function to format token amount
  const formatTokenAmountLocal = (amount: string, tokenAddress: string) => {
    if (!amount || amount === "0") return "0.00";
    
    const usdcAddress = getTokenAddress("USDC");
    const usdtAddress = getTokenAddress("USDT");
    const idrxAddress = getTokenAddress("IDRX");
    
    let decimals = 6; // Default for USDC/USDT
    let displayDecimals = 2; // How many decimal places to show
    if (tokenAddress.toLowerCase() === idrxAddress.toLowerCase()) {
      decimals = 2;
      displayDecimals = 2;
    }
    
    // Handle large numbers by using string manipulation instead of parseFloat
    const amountStr = amount.toString();
    let formattedAmount;
    
    if (amountStr.length <= decimals) {
      // Amount is less than 1 unit
      const paddedAmount = amountStr.padStart(decimals + 1, '0');
      const integerPart = paddedAmount.slice(0, -decimals) || '0';
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
    const escrowData = escrows.find(escrow => escrow.escrowId === escrowId);
    
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
    
    // For top up, use the allocated amount directly without multiplication
    // This prevents the issue where we're multiplying an already correctly formatted amount
    // The user can still top up more than the allocated amount by entering a custom value
    // No multiplication needed - use the amount as-is
    
    console.log("🔍 Max amount calculation debug:", {
      escrowData: escrowData ? {
        allocatedAmount: escrowData.allocatedAmount,
        totalAmount: escrowData.totalAmount
      } : null,
      originalMaxAmount: escrowData?.allocatedAmount || escrowData?.totalAmount || "default",
      maxAmount: maxAmount
    });
    
    // Get user's token balance
    const balance = await getUserTokenBalance(tokenType);
    const balanceFormatted = formatTokenAmount(balance, tokenType === "IDRX" ? 18 : 6);
    setUserTokenBalance(balanceFormatted);
    
    // Format max amount with proper decimals
    const maxAmountFormatted = formatTokenAmount(BigInt(maxAmount), tokenType === "IDRX" ? 18 : 6);
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
      decimals: tokenAddress.toLowerCase() === "0x77fea84656b5ef40bf33e3835a9921daeaadb976" ? 2 : 6,
      allocatedAmount: escrowData?.allocatedAmount,
      totalAmount: escrowData?.totalAmount,
      hasContractDetails: contractDetails.has(escrowId)
    });
    
    setTopUpModal({
      isOpen: true,
      escrowId,
      tokenAddress,
      tokenType: tokenType as "USDC" | "IDRX",
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
  const getTokenContract = (tokenType: "USDC" | "USDT" | "IDRX") => {
    if (tokenType === "USDC") {
      return usdcContract;
    } else if (tokenType === "USDT") {
      return usdtContract;
    } else {
      return idrxContract;
    }
  };

  // Function to get escrow contract based on token type
  const getEscrowContract = (tokenType: "USDC" | "USDT" | "IDRX") => {
    if (tokenType === "USDC" || tokenType === "USDT") {
      return escrowContract; // USDT uses same escrow contract as USDC
    } else {
      return escrowIdrxContract;
    }
  };

  // Function to get user's token balance
  const getUserTokenBalance = async (tokenType: "USDC" | "USDT" | "IDRX") => {
    if (!address) return BigInt(0);
    
    try {
      const tokenContract = getTokenContract(tokenType);
      const balance = await tokenContract.read.balanceOf([address as `0x${string}`]);
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
        alert(`Amount cannot exceed maximum allowed: ${actualMax} ${topUpModal.tokenSymbol}`);
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
        actualMax
      });

      // Convert amount to proper decimals using viem's parseUnits
      const decimals = tokenType === "IDRX" ? 2 : 6;
      const amountInWei = parseTokenAmount(amount.toString(), decimals);

      console.log("💰 Amount in wei:", amountInWei.toString());

      // Check if user has enough balance
      const userBalance = await checkTokenBalance(tokenType, address);
      if (userBalance < amountInWei) {
        throw new Error(`Insufficient balance. You have ${formatTokenAmount(userBalance, tokenType === "IDRX" ? 2 : 6)} ${tokenType}`);
      }

      // Check current allowance
      const currentAllowance = await checkTokenAllowance(tokenType, address, escrowId);
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
        
        // Call the parent's onTopupFund callback
        onTopupFund(escrowId);
      } else {
        throw new Error(result.error || "Failed to topup funds");
      }
      
    } catch (error) {
      console.error("❌ Top up failed:", error);
      alert("Top up failed: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsTopUpLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6 animate-pulse">
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
        <h3 className="text-xl font-semibold text-white mb-2">No Escrows Found</h3>
        <p className="text-white/60 mb-6">
          You haven't created any escrows yet. Create your first escrow to get started.
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
                    <span className="text-white/80 text-sm">
                      Active
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => openTopUpModal(escrow.escrowId, escrow.tokenAddress)}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-green-500/25 transition-all duration-200 flex items-center space-x-2"
                >
                  <ArrowUp className="w-4 h-4" />
                  <span>Top Up</span>
                </button>
                
                <button
                  onClick={() => toggleDetails(escrow.escrowId, escrow.tokenAddress)}
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
                    onClick={() => setSelectedEscrow(selectedEscrow === escrow.escrowId ? null : escrow.escrowId)}
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
                          onEscrowDeleted();
                          setSelectedEscrow(null);
                        }}
                        className="w-full px-4 py-3 text-left text-red-400 hover:bg-red-500/10 flex items-center space-x-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
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
                    <span className="text-white/60">Loading contract details...</span>
                  </div>
                ) : details ? (
                  <div className="space-y-6">
                    {/* Contract Details Header */}
                    <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-4">
                      <h4 className="text-lg font-semibold text-white mb-4">Contract Details</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <p className="text-white/60 text-sm">Sender Address</p>
                            <p className="text-white font-mono text-sm">{formatAddress(details.escrowRoom.sender)}</p>
                          </div>
                          <div>
                            <p className="text-white/60 text-sm">Token Type</p>
                            <p className="text-white font-semibold">{details.tokenType}</p>
                          </div>
                          <div>
                            <p className="text-white/60 text-sm">Created At</p>
                            <p className="text-white text-sm">{formatTimestamp(details.escrowRoom.createdAt.toString())}</p>
                          </div>
                          <div>
                            <p className="text-white/60 text-sm">Last Top Up</p>
                            <p className="text-white text-sm">{formatTimestamp(details.escrowRoom.lastTopUpAt.toString())}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <p className="text-white/60 text-sm">Total Allocated</p>
                            <p className="text-white font-semibold">
                              {formatTokenAmount(details.escrowRoom.totalAllocatedAmount, escrow.tokenType === "IDRX" ? 18 : 6)} tokens
                            </p>
                          </div>
                          <div>
                            <p className="text-white/60 text-sm">Total Deposited</p>
                            <p className="text-white font-semibold">
                              {formatTokenAmount(details.escrowRoom.totalDepositedAmount, escrow.tokenType === "IDRX" ? 18 : 6)} tokens
                            </p>
                          </div>
                          <div>
                            <p className="text-white/60 text-sm">Total Withdrawn</p>
                            <p className="text-white font-semibold">
                              {formatTokenAmount(details.escrowRoom.totalWithdrawnAmount, escrow.tokenType === "IDRX" ? 18 : 6)} tokens
                            </p>
                          </div>
                          <div>
                            <p className="text-white/60 text-sm">Available Balance</p>
                            <p className="text-green-400 font-semibold">
                              {formatTokenAmount(details.escrowRoom.availableBalance, escrow.tokenType === "IDRX" ? 18 : 6)} tokens
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Receiver Information */}
                    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
                      <h4 className="text-lg font-semibold text-white mb-4">Receiver Information</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-white/60 text-sm">Total Receivers</p>
                          <p className="text-white font-semibold">{details.totalReceivers}</p>
                        </div>
                        <div>
                          <p className="text-white/60 text-sm">Active Receivers</p>
                          <p className="text-white font-semibold">{details.escrowRoom.activeReceiverCount}</p>
                        </div>
                      </div>

                      {details.receivers && details.receivers.length > 0 && (
                        <div>
                          <p className="text-white/60 text-sm mb-2">Receiver Details</p>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {details.receivers.map((receiver, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                                <div className="flex items-center space-x-2">
                                  <span className="text-purple-400 text-sm font-medium">{index + 1}.</span>
                                  <span className="text-white font-mono text-sm">{formatAddress(receiver.receiverAddress)}</span>
                                </div>
                                <div className="text-right">
                                  <div className="text-white text-xs">
                                    Allocated: {formatTokenAmount(receiver.currentAllocation, escrow.tokenType === "IDRX" ? 18 : 6)}
                                  </div>
                                  <div className="text-white/60 text-xs">
                                    Withdrawn: {formatTokenAmount(receiver.withdrawnAmount, escrow.tokenType === "IDRX" ? 18 : 6)}
                                  </div>
                                  <div className={`text-xs ${receiver.isActive ? 'text-green-400' : 'text-red-400'}`}>
                                    {receiver.isActive ? 'Active' : 'Inactive'}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

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
                    <p className="text-red-400 font-medium">Failed to load contract details</p>
                    <p className="text-white/60 text-sm mt-2">Please try again later</p>
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
                <h4 className="text-cyan-300 font-medium mb-2">Escrow Details</h4>
                <div className="space-y-1 text-sm">
                  <p className="text-white/60">Escrow ID: <span className="text-white font-mono">{topUpModal.escrowId.slice(0, 8)}...</span></p>
                  <p className="text-white/60">Token: <span className="text-white font-medium">{topUpModal.tokenSymbol}</span></p>
                  <p className="text-white/60">Your Balance: <span className="text-white font-medium">{userTokenBalance} {topUpModal.tokenSymbol}</span></p>
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
                    step="0.01"
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
                      <span>Topup {topUpAmount} {topUpModal.tokenSymbol}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
