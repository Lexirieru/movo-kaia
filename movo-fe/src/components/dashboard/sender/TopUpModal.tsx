"use client";

import { useState } from "react";
import { X, ArrowUp, RefreshCw, CheckCircle, ExternalLink } from "lucide-react";
import { useWallet } from "@/lib/walletContext";
import { useWalletClientHook } from "@/lib/useWalletClient";
import {
  parseTokenAmount,
  formatTokenAmount,
  topUpFunds,
  checkTokenBalance,
  checkTokenAllowance,
  approveTokens,
//   getTokenAddress,
} from "@/lib/smartContract";
import { TokenType } from "@/app/api/api";
import { clearCacheAfterTopup } from "@/app/api/api";

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  escrowId: string;
  tokenAddress: string;
  tokenType: TokenType;
  maxAmount: string;
  maxAmountFormatted: string;
  tokenSymbol: string;
  userTokenBalance: string;
  onTopUpSuccess: (details: TopUpSuccessDetails) => void;
}

interface TopUpSuccessDetails {
  escrowId: string;
  amount: string;
  tokenSymbol: string;
  transactionHash: string;
  gasUsed?: string;
  timestamp: Date;
}

interface TopUpStep {
  id: string;
  title: string;
  status: "pending" | "processing" | "completed" | "error";
  errorMessage?: string;
}

export default function TopUpModal({
  isOpen,
  onClose,
  escrowId,
  tokenAddress,
  tokenType,
  maxAmount,
  maxAmountFormatted,
  tokenSymbol,
  userTokenBalance,
  onTopUpSuccess,
}: TopUpModalProps) {
  const { address, isConnected } = useWallet();
  const walletClient = useWalletClientHook();

  const [topUpAmount, setTopUpAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successDetails, setSuccessDetails] = useState<TopUpSuccessDetails | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [steps, setSteps] = useState<TopUpStep[]>([
    { id: "validate", title: "Validating amount", status: "pending" },
    { id: "balance", title: "Checking balance", status: "pending" },
    { id: "allowance", title: "Checking allowance", status: "pending" },
    { id: "approve", title: "Approving tokens", status: "pending" },
    { id: "topup", title: "Processing top up", status: "pending" },
  ]);

  const updateStepStatus = (stepIndex: number, status: TopUpStep["status"], errorMessage?: string) => {
    setSteps(prev => prev.map((step, index) => 
      index === stepIndex 
        ? { ...step, status, errorMessage }
        : step
    ));
  };

  const resetModal = () => {
    setTopUpAmount("");
    setIsProcessing(false);
    setShowSuccessModal(false);
    setSuccessDetails(null);
    setCurrentStep(0);
    setSteps([
      { id: "validate", title: "Validating amount", status: "pending" },
      { id: "balance", title: "Checking balance", status: "pending" },
      { id: "allowance", title: "Checking allowance", status: "pending" },
      { id: "approve", title: "Approving tokens", status: "pending" },
      { id: "topup", title: "Processing top up", status: "pending" },
    ]);
  };

  const handleClose = () => {
    if (!isProcessing) {
      resetModal();
      onClose();
    }
  };

  const handleTopUp = async () => {
    if (!address || !isConnected || !walletClient) {
      alert("Please connect your wallet first");
      return;
    }

    setIsProcessing(true);
    setCurrentStep(0);

    try {
      // Step 1: Validate amount
      updateStepStatus(0, "processing");
      const amount = parseFloat(topUpAmount);
      
      if (isNaN(amount) || amount <= 0) {
        updateStepStatus(0, "error", "Please enter a valid amount");
        return;
      }

      const maxAmountNumber = parseFloat(maxAmountFormatted);
      const userBalanceNumber = parseFloat(userTokenBalance);
      const actualMax = Math.min(maxAmountNumber, userBalanceNumber);

      if (amount > actualMax) {
        updateStepStatus(0, "error", `Amount cannot exceed maximum allowed: ${actualMax} ${tokenSymbol}`);
        return;
      }

      updateStepStatus(0, "completed");
      setCurrentStep(1);

      // Step 2: Check balance
      updateStepStatus(1, "processing");
      const decimals = tokenType === "IDRX" ? 2 : 6;
      const amountInWei = parseTokenAmount(amount.toString(), decimals);

      const userBalance = await checkTokenBalance(tokenType, address);
      if (userBalance < amountInWei) {
        updateStepStatus(1, "error", `Insufficient balance. You have ${formatTokenAmount(userBalance, decimals)} ${tokenType}`);
        return;
      }

      updateStepStatus(1, "completed");
      setCurrentStep(2);

      // Step 3: Check allowance
      updateStepStatus(2, "processing");
      const currentAllowance = await checkTokenAllowance(tokenType, address, escrowId);
      
      updateStepStatus(2, "completed");
      setCurrentStep(3);

      // Step 4: Approve tokens if needed
      if (currentAllowance < amountInWei) {
        updateStepStatus(3, "processing");
        const approvalSuccess = await approveTokens(walletClient, tokenType, escrowId, amountInWei);
        
        if (!approvalSuccess) {
          updateStepStatus(3, "error", "Failed to approve tokens for escrow contract");
          return;
        }
        updateStepStatus(3, "completed");
      } else {
        updateStepStatus(3, "completed");
      }
      
      setCurrentStep(4);

      // Step 5: Perform topup
      updateStepStatus(4, "processing");
      const result = await topUpFunds(walletClient, escrowId, amountInWei, tokenType);

      if (result.success) {
        updateStepStatus(4, "completed");
        
        // Prepare success details
        const details: TopUpSuccessDetails = {
          escrowId,
          amount: topUpAmount,
          tokenSymbol,
          transactionHash: result.transactionHash || "",
          timestamp: new Date(),
        };

        setSuccessDetails(details);
        setShowSuccessModal(true);
        
        // Clear cache to refresh escrow data
        clearCacheAfterTopup(escrowId, address || "");
        
        // Call success callback
        onTopUpSuccess(details);
      } else {
        updateStepStatus(4, "error", result.error || "Failed to topup funds");
      }

    } catch (error) {
      console.error("❌ Top up failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      updateStepStatus(currentStep, "error", errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  // Success Modal
  if (showSuccessModal && successDetails) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900/95 border border-green-400/20 rounded-2xl w-full max-w-md">
          {/* Success Header */}
          <div className="flex justify-between items-center p-6 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-white text-xl font-semibold">Top Up Successful!</h3>
                <p className="text-green-400 text-sm">Funds added to escrow</p>
              </div>
            </div>
            <button
              onClick={handleSuccessClose}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Transaction Summary */}
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4">
              <h4 className="text-green-300 font-medium mb-3">Transaction Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Amount Added:</span>
                  <span className="text-white font-semibold">
                    {successDetails.amount} {successDetails.tokenSymbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Escrow ID:</span>
                  <span className="text-white font-mono text-xs">
                    {successDetails.escrowId.slice(0, 8)}...{successDetails.escrowId.slice(-6)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Time:</span>
                  <span className="text-white">
                    {successDetails.timestamp.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Transaction Hash */}
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4">
              <h4 className="text-blue-300 font-medium mb-2">Transaction Details</h4>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Transaction Hash:</p>
                  <p className="text-white font-mono text-xs">
                    {successDetails.transactionHash.slice(0, 10)}...{successDetails.transactionHash.slice(-8)}
                  </p>
                </div>
                <a
                  href={`https://klaytnscope.com/tx/${successDetails.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="text-sm">View</span>
                </a>
              </div>
            </div>

            {/* Success Actions */}
            <div className="flex space-x-3">
              <button
                onClick={handleSuccessClose}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg hover:shadow-green-500/25 transition-all duration-300 font-medium"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Top Up Modal
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900/95 border border-cyan-400/20 rounded-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <div>
            <h3 className="text-white text-xl font-semibold">Top Up Funds</h3>
            <p className="text-white/60 text-sm">
              Add more {tokenSymbol} to your escrow
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Escrow Info */}
          <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-4">
            <h4 className="text-cyan-300 font-medium mb-2">Escrow Details</h4>
            <div className="space-y-1 text-sm">
              <p className="text-white/60">
                Escrow ID: <span className="text-white font-mono">{escrowId.slice(0, 8)}...</span>
              </p>
              <p className="text-white/60">
                Token: <span className="text-white font-medium">{tokenSymbol}</span>
              </p>
              <p className="text-white/60">
                Your Balance: <span className="text-white font-medium">{userTokenBalance} {tokenSymbol}</span>
              </p>
            </div>
          </div>

          {/* Amount Input */}
          {!isProcessing && (
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Amount to Top Up ({tokenSymbol})
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all pr-20"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 text-sm">
                  {tokenSymbol}
                </div>
              </div>
              <p className="text-white/60 text-xs mt-1">
                Max: {maxAmountFormatted} {tokenSymbol}
              </p>
            </div>
          )}

          {/* Processing Steps */}
          {isProcessing && (
            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-4">
              <h4 className="text-purple-300 font-medium mb-3">Processing Transaction</h4>
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      step.status === "completed" 
                        ? "bg-green-500/20 text-green-400"
                        : step.status === "processing"
                          ? "bg-blue-500/20 text-blue-400"
                          : step.status === "error"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-gray-500/20 text-gray-400"
                    }`}>
                      {step.status === "completed" ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : step.status === "processing" ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : step.status === "error" ? (
                        <X className="w-4 h-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm ${
                        step.status === "error" ? "text-red-400" : "text-white"
                      }`}>
                        {step.title}
                      </p>
                      {step.status === "error" && step.errorMessage && (
                        <p className="text-red-400 text-xs mt-1">{step.errorMessage}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? "Processing..." : "Cancel"}
            </button>
            {!isProcessing && (
              <button
                onClick={handleTopUp}
                disabled={
                  !topUpAmount ||
                  parseFloat(topUpAmount) <= 0 ||
                  !walletClient ||
                  !isConnected
                }
                className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
                  !topUpAmount ||
                  parseFloat(topUpAmount) <= 0 ||
                  !walletClient ||
                  !isConnected
                    ? "bg-gray-500/50 text-gray-300 cursor-not-allowed"
                    : "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-500/25 hover:scale-105"
                }`}
              >
                <ArrowUp className="w-5 h-5" />
                <span>Top Up {topUpAmount} {tokenSymbol}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}