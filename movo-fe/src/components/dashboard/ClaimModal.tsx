"use client";

import { useState, useEffect } from "react";
import { X, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { useWallet } from "@/lib/walletContext";
import { useWalletClientHook } from "@/lib/useWalletClient";
import {
  withdrawUSDCToCrypto,
  withdrawIDRXToCrypto,
  parseTokenAmount,
} from "@/lib/smartContract";

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
  const walletClient = useWalletClientHook();
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

  // Check if this escrow has vesting
  const hasVesting = escrow?.vestingInfo && escrow?.vestingStatus;
  const vestingStatus = escrow?.vestingStatus;

  // Get available amount based on vesting or regular escrow
  const getAvailableAmount = () => {
    if (hasVesting && vestingStatus) {
      // For vesting escrows, use the vested amount available to withdraw
      return vestingStatus.availableToWithdraw;
    }
    // For regular escrows, use the standard available amount
    return escrow.availableAmount || "0";
  };

  // Get raw amount for smart contract calls
  const getAvailableRawAmount = () => {
    if (hasVesting && escrow.vestingInfo) {
      // Use the raw BigInt value from vesting info
      return escrow.vestingInfo.receiverVestingInfo.availableToClaim.toString();
    }
    // For regular escrows, use the standard available amount
    return escrow.availableAmount || "0";
  };

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

  // Use vesting amount if available, otherwise use regular available amount
  const displayAvailableAmount = hasVesting
    ? vestingStatus.availableToWithdraw
    : formatTokenAmount(
        escrow.availableAmount || "0",
        escrow.originCurrency || "IDRX",
      );

  const availableAmount = displayAvailableAmount;

  const handleClaim = async () => {
    if (!walletClient) {
      setError("Wallet not connected");
      return;
    }

    if (!address) {
      setError("Wallet address not found");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      // Enhanced debugging - log all escrow data first
      console.log("📋 Escrow data received:", {
        escrow,
        availableAmount: escrow.availableAmount,
        availableAmountType: typeof escrow.availableAmount,
        escrowId: escrow.escrowId,
        escrowIdType: typeof escrow.escrowId,
        originCurrency: escrow.originCurrency,
        address,
        walletClient: !!walletClient,
      });

      // Validate required data
      if (!escrow.escrowId) {
        throw new Error("Escrow ID is missing");
      }

      if (!escrow.availableAmount || escrow.availableAmount === "0") {
        throw new Error("No available amount to claim");
      }

      // Calculate claim amount in the correct decimal format
      const decimals = escrow.originCurrency === "IDRX" ? 2 : 6;

      // Handle different possible formats of availableAmount
      let rawAmount;
      if (isClaimingAll) {
        // For vesting escrows, use the vested amount available to claim
        if (hasVesting && escrow.vestingInfo) {
          rawAmount = getAvailableRawAmount();
          console.log("🔄 Using vesting available amount:", {
            vestedAvailable: rawAmount,
            escrowVestingInfo: escrow.vestingInfo.receiverVestingInfo,
            note: "Using vested amount available to claim",
          });
        } else {
          // availableAmount should already be in wei format from the API
          rawAmount = escrow.availableAmount.toString();
        }

        console.log("🔍 Amount format detection:", {
          originalAmount: escrow.availableAmount,
          rawAmount,
          numericValue: parseFloat(rawAmount),
          decimals,
          expectedMaxHumanReadable: 10000,
        });

        // IMPORTANT: Do NOT convert here - availableAmount should already be in wei format
        // The formatTokenAmount function in the UI already handles display conversion
        // So escrow.availableAmount should be the raw wei amount ready for contract calls
      } else {
        // For partial claim, convert user input (human readable) to raw amount (wei format)
        const userAmount = parseFloat(partialAmount);
        if (isNaN(userAmount) || userAmount <= 0) {
          throw new Error("Invalid partial amount");
        }

        // User sees formatted amount (e.g., "30000.00" IDRX), but we need wei format
        rawAmount = (userAmount * Math.pow(10, decimals)).toString();

        // For vesting escrows, validate against vested available amount
        if (hasVesting && escrow.vestingInfo) {
          const maxVestedAmount = parseFloat(vestingStatus.availableToWithdraw);
          if (userAmount > maxVestedAmount) {
            throw new Error(
              `Amount exceeds vested available: ${maxVestedAmount} ${escrow.originCurrency}`,
            );
          }
        }

        console.log("🔄 Partial amount conversion:", {
          userInputAmount: partialAmount,
          userAmount,
          decimals,
          convertedRawAmount: rawAmount,
          isVesting: hasVesting,
          maxVestedAmount: hasVesting
            ? vestingStatus.availableToWithdraw
            : "N/A",
          explanation: `User input ${userAmount} * 10^${decimals} = ${rawAmount} wei`,
        });
      }

      // Validate rawAmount is a valid number string
      if (!/^\d+$/.test(rawAmount)) {
        throw new Error(`Invalid amount format: ${rawAmount}`);
      }

      console.log("💰 Amount calculation:", {
        isClaimingAll,
        partialAmount,
        rawAmount,
        decimals,
        escrowAvailableAmount: escrow.availableAmount,
      });

      // Convert to bigint for smart contract interaction
      // rawAmount should already be in wei format, so convert directly to BigInt
      const claimAmountBigInt = BigInt(rawAmount);

      console.log("🔄 BigInt conversion:", {
        rawAmount,
        claimAmountBigInt: claimAmountBigInt.toString(),
        note: "rawAmount should already be in wei format, no decimal conversion needed",
      });

      console.log("🚀 Starting claim process:", {
        escrowId: escrow.escrowId,
        tokenType: escrow.originCurrency,
        rawAmount,
        claimAmountBigInt: claimAmountBigInt.toString(),
        decimals,
        isClaimingAll,
        userAddress: address,
        walletClientConnected: !!walletClient,
      });

      let result;

      // Final validation before calling smart contract
      if (!walletClient.account?.address) {
        throw new Error("Wallet account address not found");
      }

      if (claimAmountBigInt <= BigInt(0)) {
        throw new Error("Claim amount must be greater than 0");
      }

      console.log("🔗 Calling smart contract function:", {
        function:
          escrow.originCurrency === "IDRX"
            ? "withdrawIDRXToCrypto"
            : "withdrawUSDCToCrypto",
        walletClientAccount: walletClient?.account?.address,
        connectedAddress: address,
        escrowId: escrow.escrowId,
        escrowIdLength: escrow.escrowId?.length,
        claimAmountBigInt: claimAmountBigInt.toString(),
        claimAmountBigIntType: typeof claimAmountBigInt,
      });

      // Call the appropriate withdraw function based on token type
      if (escrow.originCurrency === "IDRX") {
        console.log("📞 Calling withdrawIDRXToCrypto...");
        try {
          result = await withdrawIDRXToCrypto(
            walletClient,
            escrow.escrowId,
            claimAmountBigInt,
          );
        } catch (contractError) {
          console.error(
            "❌ Direct error from withdrawIDRXToCrypto:",
            contractError,
          );
          throw contractError; // Re-throw to get the original error
        }
      } else {
        console.log("📞 Calling withdrawUSDCToCrypto...");
        try {
          // For USDC, USDT, etc.
          result = await withdrawUSDCToCrypto(
            walletClient,
            escrow.escrowId,
            claimAmountBigInt,
          );
        } catch (contractError) {
          console.error(
            "❌ Direct error from withdrawUSDCToCrypto:",
            contractError,
          );
          throw contractError; // Re-throw to get the original error
        }
      }

      console.log("🔄 Smart contract result:", {
        success: result.success,
        transactionHash: result.transactionHash,
        error: result.error,
        fullResult: result,
      });

      if (result.success && result.transactionHash) {
        setTxHash(result.transactionHash);
        console.log("✅ Claim successful:", {
          txHash: result.transactionHash,
          escrowId: escrow.escrowId,
          amount: rawAmount,
        });

        // Close modal after success
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        console.error("❌ Transaction failed details:", {
          resultSuccess: result.success,
          resultError: result.error,
          hasTransactionHash: !!result.transactionHash,
          result,
        });
        throw new Error(result.error || "Transaction failed");
      }
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
                  <span className="text-white/60">
                    {hasVesting ? "Vested Available:" : "Available:"}
                  </span>
                  <div
                    className={`font-medium ${hasVesting ? "text-orange-400" : "text-white"}`}
                  >
                    {availableAmount} {escrow.originCurrency}
                  </div>
                  {hasVesting && (
                    <div className="text-xs text-orange-400/80 mt-1">
                      From vesting schedule
                    </div>
                  )}
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
                  {hasVesting && (
                    <div className="text-xs text-white/60 mt-1">
                      (Vesting in progress)
                    </div>
                  )}
                </div>
              </div>

              {/* Vesting Progress Information */}
              {hasVesting && vestingStatus && (
                <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-orange-400 font-medium text-sm flex items-center">
                      🕒 Vesting Progress
                    </span>
                    <span className="text-orange-400 text-sm">
                      {vestingStatus.progressPercentage.toFixed(1)}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                    <div
                      className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(0, vestingStatus.progressPercentage))}%`,
                      }}
                    ></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-white/60">Total Vested:</span>
                      <div className="text-orange-400">
                        {vestingStatus.totalVested} {vestingStatus.tokenSymbol}
                      </div>
                    </div>
                    <div>
                      <span className="text-white/60">Remaining:</span>
                      <div className="text-white">
                        {vestingStatus.remainingDays > 0
                          ? `${vestingStatus.remainingDays} days`
                          : "Complete"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Claim Options */}
            <div className="mb-6 space-y-4">
              <h4 className="text-white font-medium">
                {hasVesting ? "Claim Vested Amount" : "Claim Amount"}
              </h4>

              {/* Claim All Option */}
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  checked={isClaimingAll}
                  onChange={() => setIsClaimingAll(true)}
                  className="w-4 h-4 text-cyan-400 bg-gray-700 border-gray-600 focus:ring-cyan-400 focus:ring-2"
                />
                <span className="text-white">
                  {hasVesting
                    ? `Claim all vested (${availableAmount} ${escrow.originCurrency})`
                    : `Claim all available (${availableAmount} ${escrow.originCurrency})`}
                </span>
                {hasVesting && (
                  <span className="text-orange-400 text-sm ml-2">
                    • From vesting
                  </span>
                )}
              </label>

              {/* Partial Claim Option */}
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  checked={!isClaimingAll}
                  onChange={() => setIsClaimingAll(false)}
                  disabled={hasVesting && parseFloat(availableAmount) === 0}
                  className="w-4 h-4 text-cyan-400 bg-gray-700 border-gray-600 focus:ring-cyan-400 focus:ring-2 disabled:opacity-50"
                />
                <span className="text-white">
                  {hasVesting
                    ? "Claim partial vested amount"
                    : "Claim partial amount"}
                </span>
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
                    {hasVesting
                      ? `Maximum vested: ${availableAmount} ${escrow.originCurrency}`
                      : `Maximum: ${availableAmount} ${escrow.originCurrency}`}
                  </p>
                  {hasVesting && (
                    <p className="text-orange-400/80 text-xs mt-1">
                      ⚠️ You can only claim vested amounts
                    </p>
                  )}
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
                disabled={
                  isProcessing ||
                  !validatePartialAmount() ||
                  (hasVesting && parseFloat(availableAmount) === 0)
                }
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Claiming...</span>
                  </>
                ) : (
                  <span>
                    {hasVesting
                      ? `Claim ${isClaimingAll ? "Vested" : partialAmount} ${escrow.originCurrency}`
                      : `Claim ${isClaimingAll ? "All" : partialAmount} ${escrow.originCurrency}`}
                  </span>
                )}
              </button>
            </div>
          </>
        )}

        {/* No Vested Amount Warning */}
        {hasVesting && parseFloat(availableAmount) === 0 && (
          <div className="mt-6 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
              <div className="text-orange-300 text-xs">
                <p className="mb-1">
                  <strong>No Vested Amount Available</strong>
                </p>
                <p>
                  No tokens have vested yet. Check back when more time has
                  passed in the vesting schedule.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Additional Info */}
        <div className="mt-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-blue-300 text-xs">
              <p className="mb-1">
                <strong>Note:</strong>
                {hasVesting
                  ? " This action will transfer vested tokens directly to your connected wallet."
                  : " This action will transfer tokens directly to your connected wallet."}
              </p>
              <p>Make sure you have enough ETH for gas fees.</p>
              {hasVesting && (
                <p className="mt-1 text-orange-300">
                  <strong>Vesting:</strong> You can only claim tokens that have
                  already vested according to the schedule.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
