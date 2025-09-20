"use client";

import { useState, useEffect } from "react";
import { X, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { useWallet } from "@/lib/walletContext";

interface ClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  escrow: any;
}

export default function ClaimModal({
  isOpen,
  onClose,
  escrow,
}: ClaimModalProps) {
  const { address } = useWallet();
  const [isClaimingAll, setIsClaimingAll] = useState(true);
  const [partialAmount, setPartialAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsClaimingAll(true);
      setPartialAmount("");
      setIsProcessing(false);
      setTxHash("");
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatTokenAmount = (amount: string, tokenType: string) => {
    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber)) return "0.00";

    let formattedAmount = amountNumber;

    // Handle decimal conversion based on token type
    if (tokenType === "USDC" || tokenType === "USDT") {
      if (amountNumber > 10000) {
        formattedAmount = amountNumber / 1000000;
      }
    } else if (tokenType === "IDRX") {
      if (amountNumber > 10000) {
        formattedAmount = amountNumber / 100;
      }
    }

    return formattedAmount.toFixed(2);
  };

  const availableAmount = formatTokenAmount(
    escrow.availableAmount || "0",
    escrow.originCurrency || "IDRX",
  );

  const handleClaim = async () => {
    setIsProcessing(true);
    setError("");

    try {
      const claimAmount = isClaimingAll
        ? escrow.availableAmount
        : (
            parseFloat(partialAmount) *
            (escrow.originCurrency === "IDRX" ? 100 : 1000000)
          ).toString();

      console.log("🚀 Starting claim process:", {
        escrowId: escrow.escrowId,
        tokenType: escrow.originCurrency,
        claimAmount,
        isClaimingAll,
        userAddress: address,
      });

      // Here you would implement the actual smart contract interaction
      // For now, we'll simulate the process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simulate transaction hash
      const simulatedTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      setTxHash(simulatedTxHash);

      console.log("✅ Claim successful:", {
        txHash: simulatedTxHash,
        escrowId: escrow.escrowId,
        amount: claimAmount,
      });

      // Close modal after success
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err: any) {
      console.error("❌ Claim failed:", err);
      setError(err.message || "Failed to claim tokens");
    } finally {
      setIsProcessing(false);
    }
  };

  const validatePartialAmount = () => {
    if (!isClaimingAll) {
      const amount = parseFloat(partialAmount);
      const maxAmount = parseFloat(availableAmount);
      return !isNaN(amount) && amount > 0 && amount <= maxAmount;
    }
    return true;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-white/20 rounded-2xl p-6 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Claim Tokens</h3>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-white/60 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Transaction Success */}
        {txHash && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-medium">
                Claim Successful!
              </span>
            </div>
            <p className="text-white/80 text-sm mb-2">
              Your tokens have been claimed successfully.
            </p>
            <div className="bg-black/20 rounded p-2">
              <p className="text-white/60 text-xs mb-1">Transaction Hash:</p>
              <p className="text-green-400 text-xs font-mono break-all">
                {txHash}
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-400 font-medium">Claim Failed</span>
            </div>
            <p className="text-white/80 text-sm mt-1">{error}</p>
          </div>
        )}

        {!txHash && (
          <>
            {/* Escrow Info */}
            <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">
                    {escrow.originCurrency?.charAt(0) || "T"}
                  </span>
                </div>
                <div>
                  <h4 className="text-white font-medium">
                    From:{" "}
                    {escrow.senderName ||
                      `${escrow.senderWalletAddress?.slice(0, 6)}...${escrow.senderWalletAddress?.slice(-4)}`}
                  </h4>
                  <p className="text-white/60 text-sm">
                    Escrow ID: {escrow.escrowId?.slice(0, 12)}...
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-white/60">Available:</span>
                  <div className="text-white font-medium">
                    {availableAmount} {escrow.originCurrency}
                  </div>
                </div>
                <div>
                  <span className="text-white/60">Total Allocated:</span>
                  <div className="text-white font-medium">
                    {formatTokenAmount(
                      escrow.allocatedAmount || "0",
                      escrow.originCurrency || "IDRX",
                    )}{" "}
                    {escrow.originCurrency}
                  </div>
                </div>
              </div>
            </div>

            {/* Claim Options */}
            <div className="mb-6 space-y-4">
              <h4 className="text-white font-medium">Claim Amount</h4>

              {/* Claim All Option */}
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  checked={isClaimingAll}
                  onChange={() => setIsClaimingAll(true)}
                  className="w-4 h-4 text-cyan-400 bg-gray-700 border-gray-600 focus:ring-cyan-400 focus:ring-2"
                />
                <span className="text-white">
                  Claim all available ({availableAmount} {escrow.originCurrency}
                  )
                </span>
              </label>

              {/* Partial Claim Option */}
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  checked={!isClaimingAll}
                  onChange={() => setIsClaimingAll(false)}
                  className="w-4 h-4 text-cyan-400 bg-gray-700 border-gray-600 focus:ring-cyan-400 focus:ring-2"
                />
                <span className="text-white">Claim partial amount</span>
              </label>

              {/* Partial Amount Input */}
              {!isClaimingAll && (
                <div className="ml-7 space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={partialAmount}
                      onChange={(e) => setPartialAmount(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      max={availableAmount}
                      step="0.01"
                      className="flex-1 bg-gray-800 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/40 focus:border-cyan-400 focus:outline-none"
                    />
                    <span className="text-white/60 text-sm">
                      {escrow.originCurrency}
                    </span>
                  </div>
                  <p className="text-white/60 text-xs">
                    Maximum: {availableAmount} {escrow.originCurrency}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="flex-1 px-4 py-3 border border-white/20 text-white rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleClaim}
                disabled={isProcessing || !validatePartialAmount()}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Claiming...</span>
                  </>
                ) : (
                  <span>
                    Claim {isClaimingAll ? "All" : partialAmount}{" "}
                    {escrow.originCurrency}
                  </span>
                )}
              </button>
            </div>
          </>
        )}

        {/* Additional Info */}
        <div className="mt-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-blue-300 text-xs">
              <p className="mb-1">
                <strong>Note:</strong> This action will transfer tokens directly
                to your connected wallet.
              </p>
              <p>Make sure you have enough ETH for gas fees.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
