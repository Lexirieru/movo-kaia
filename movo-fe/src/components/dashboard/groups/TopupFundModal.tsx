"use client";

import { useState, useEffect } from "react";
import {
  X,
  DollarSign,
  Wallet,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { useWalletClientHook } from "@/lib/useWalletClient";
import { useWallet } from "@/lib/walletContext";
import { getEscrowDetails } from "@/app/api/api";
import {
  topUpFunds,
  checkTokenBalance,
  checkTokenAllowance,
  approveTokens,
} from "@/lib/smartContract";
import { formatTokenAmount, parseTokenAmount } from "@/lib/smartContract";
import { getEscrowAddress } from "@/lib/contractConfig";
import { useAuth } from "@/lib/userContext";

interface TopupFundModalProps {
  isOpen: boolean;
  onClose: () => void;
  escrowId: string;
}

export default function TopupFundModal({
  isOpen,
  onClose,
  escrowId,
}: TopupFundModalProps) {
  const { user } = useAuth();

  const walletClient = useWalletClientHook();
  const { isConnected, address } = useWallet();
  const [escrowData, setEscrowData] = useState<any>(null);
  const [topupAmount, setTopupAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [tokenBalance, setTokenBalance] = useState<string>("0");
  const [tokenAllowance, setTokenAllowance] = useState<string>("0");
  const [escrowContractAddress, setEscrowContractAddress] = useState<string>("");
  const [isApproved, setIsApproved] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [tokenType, setTokenType] = useState<"USDC" | "USDT" | "IDRX">("USDC");

  useEffect(() => {
    if (isOpen && escrowId) {
      const fetchData = async () => {
        setIsLoadingData(true);
        try {
          // Load escrow details from the API
          const escrowResult = await getEscrowDetails(escrowId);
          if (escrowResult) {
            setEscrowData(escrowResult);
            // Determine token type based on contractId
            const contractId = escrowResult.contractId_;
            if (contractId && contractId.includes("IDRX")) {
              setTokenType("IDRX");
            } else if (contractId && contractId.includes("USDT")) {
              setTokenType("USDT");
            } else {
              setTokenType("USDC");
            }
          } else {
            setEscrowData(null);
          }
        } catch (error) {
          console.error("Error loading escrow data:", error);
          setMessage({
            type: "error",
            text: "Failed to load escrow data. Please try again.",
          });
          setEscrowData(null);
        } finally {
          setIsLoadingData(false);
        }
      };
      fetchData();
    }
  }, [isOpen, escrowId]);

  // Check token balance and allowance when escrow data changes
  useEffect(() => {
    if (isConnected && address && escrowData && escrowData.escrowId) {
      checkTokenInfo();
    }
  }, [isConnected, address, escrowData]);

  // Check approval status when topup amount changes
  useEffect(() => {
    if (isConnected && address && escrowData && escrowData.escrowId && topupAmount) {
      const checkApprovalStatus = async () => {
        try {
          const parsedAmount = parseTokenAmount(
            topupAmount,
            tokenType === "USDC" || tokenType === "USDT" ? 6 : 2,
          );
          const allowance = await checkTokenAllowance(
            tokenType,
            address!,
            escrowData.escrowId,
          );
          setIsApproved(allowance >= parsedAmount);
        } catch (error) {
          console.error("Error checking approval status:", error);
        }
      };
      checkApprovalStatus();
    }
  }, [topupAmount, isConnected, address, escrowData, tokenType]);

  const checkTokenInfo = async () => {
    if (!escrowData || !escrowData.escrowId) return;

    try {
      // Get escrow contract address based on token type
      const escrowAddress = getEscrowAddress(tokenType);
      setEscrowContractAddress(escrowAddress);

      const balance = await checkTokenBalance(
        tokenType,
        address!,
      );
      const allowance = await checkTokenAllowance(
        tokenType,
        address!,
        escrowData.escrowId,
      );

      setTokenBalance(
        formatTokenAmount(balance, tokenType === "USDC" || tokenType === "USDT" ? 6 : 2),
      );
      setTokenAllowance(
        formatTokenAmount(
          allowance,
          tokenType === "USDC" || tokenType === "USDT" ? 6 : 2,
        ),
      );

      // Check if already approved
      const parsedAmount = parseTokenAmount(
        topupAmount || "0",
        tokenType === "USDC" || tokenType === "USDT" ? 6 : 2,
      );
      setIsApproved(allowance >= parsedAmount);
    } catch (error) {
      console.error("Error checking token info:", error);
    }
  };

  const handleApprove = async () => {
    if (!walletClient) {
      setMessage({
        type: "error",
        text: "Wallet client not ready. Please try reconnecting your wallet.",
      });
      return;
    }

    if (!isConnected || !address) {
      setMessage({ type: "error", text: "Please connect your wallet first." });
      return;
    }

    if (!topupAmount.trim() || parseFloat(topupAmount) <= 0) {
      setMessage({
        type: "error",
        text: "Please enter a valid amount greater than 0.",
      });
      return;
    }

    if (!escrowData || !escrowData.escrowId) {
      setMessage({
        type: "error",
        text: "Escrow data not found. Please try again.",
      });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const parsedAmount = parseTokenAmount(
        topupAmount,
        tokenType === "USDC" || tokenType === "USDT" ? 6 : 2,
      );

      // Check if user has enough balance
      const userBalance = await checkTokenBalance(
        tokenType,
        address,
      );
      if (userBalance < parsedAmount) {
        throw new Error(
          `Insufficient balance. You have ${formatTokenAmount(userBalance, tokenType === "USDC" || tokenType === "USDT" ? 6 : 2)} ${tokenType}`,
        );
      }

      // Approve tokens
      const approvalSuccess = await approveTokens(
        walletClient,
        tokenType,
        escrowData.escrowId,
        parsedAmount,
      );

      if (approvalSuccess) {
        setMessage({
          type: "success",
          text: `Approval successful! You can now proceed with topup.`,
        });
        setIsApproved(true);
        // Refresh token info
        checkTokenInfo();
      } else {
        throw new Error("Failed to approve tokens for escrow contract");
      }
    } catch (error) {
      console.error("Error approving tokens:", error);
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to approve tokens. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTopup = async () => {
    if (!walletClient) {
      setMessage({
        type: "error",
        text: "Wallet client not ready. Please try reconnecting your wallet.",
      });
      return;
    }

    if (!isConnected || !address) {
      setMessage({ type: "error", text: "Please connect your wallet first." });
      return;
    }

    if (!topupAmount.trim() || parseFloat(topupAmount) <= 0) {
      setMessage({
        type: "error",
        text: "Please enter a valid amount greater than 0.",
      });
      return;
    }

    if (!escrowData || !escrowData.escrowId) {
      setMessage({
        type: "error",
        text: "Escrow data not found. Please try again.",
      });
      return;
    }

    if (!isApproved) {
      setMessage({
        type: "error",
        text: "Please approve tokens first before proceeding with topup.",
      });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const parsedAmount = parseTokenAmount(
        topupAmount,
        tokenType === "USDC" || tokenType === "USDT" ? 6 : 2,
      );

      // Perform topup
      const result = await topUpFunds(
        walletClient,
        escrowData.escrowId,
        parsedAmount,
        tokenType,
      );

      if (result.success) {
        // Show custom success popup instead of browser alert
        setShowSuccessPopup(true);
        
        // Reset form and refresh data
        setTopupAmount("");
        setIsApproved(false);
        
        // Refresh the escrow data after successful topup
        const refreshData = async () => {
          const escrowResult = await getEscrowDetails(escrowId);
          if (escrowResult) {
            setEscrowData(escrowResult);
          }
        };
        refreshData();
        checkTokenInfo();
        
        // Close the modal immediately after showing success popup
        setTimeout(() => {
          onClose();
        }, 100);
        
        // Auto close success popup after 3 seconds
        setTimeout(() => {
          setShowSuccessPopup(false);
        }, 3000);
      } else {
        throw new Error(result.error || "Failed to topup funds");
      }
    } catch (error) {
      console.error("Error topping up funds:", error);
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to topup funds. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTopupAmount("");
    setMessage(null);
    setEscrowData(null);
    setIsApproved(false);
    setEscrowContractAddress("");
    setShowSuccessPopup(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900/95 border border-cyan-400/20 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <div>
            <h3 className="text-white text-xl font-semibold">
              Topup Fund
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Loading State */}
            {isLoadingData && (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mr-2" />
                <span className="text-white/60">Loading escrow data...</span>
              </div>
            )}


            {/* Escrow Information - Only show if escrow exists */}
            {!isLoadingData &&
              escrowData &&
              escrowData.escrowId &&
              escrowData.escrowId && (
                <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-4">
                  <h4 className="text-cyan-300 font-medium mb-3">
                    Escrow Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-white/60">Token Type</p>
                      <p className="text-white font-medium">
                        {tokenType}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/60">Escrow ID</p>
                      <p className="text-white font-mono text-xs break-all">
                        {escrowData.escrowId}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/60">Escrow Contract</p>
                      <p className="text-white font-mono text-xs break-all">
                        {escrowContractAddress}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/60">Total Allocated</p>
                      <p className="text-white font-medium">
                        {escrowData.totalAmount} {tokenType}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/60">Receivers</p>
                      <p className="text-white font-medium">
                        {escrowData.recipients?.length || 0} addresses
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {/* Topup Amount Input - Only show if escrow exists */}
            {!isLoadingData &&
              escrowData &&
              escrowData.escrowId &&
              escrowData.escrowId && (
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Topup Amount ({tokenType || "Token"})
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(e.target.value)}
                      placeholder="0.0"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all pr-20"
                      disabled={isLoading}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 text-sm">
                      {tokenType || "Token"}
                    </div>
                  </div>
                </div>
              )}

            {/* Token Info - Only show if escrow exists and wallet connected */}
            {!isLoadingData &&
              isConnected &&
              address &&
              escrowData &&
              escrowData.escrowId && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-white/5 border border-white/10 rounded-lg">
                  <div>
                    <p className="text-white/60 text-xs mb-1">Your Balance</p>
                    <p className="text-white font-medium">
                      {tokenBalance} {tokenType}
                    </p>
                  </div>
                  <div>
                    <p className="text-white/60 text-xs mb-1">Allowance</p>
                    <p className="text-white font-medium">
                      {tokenAllowance} {tokenType}
                    </p>
                  </div>
                </div>
              )}

            {/* Message Display */}
            {message && (
              <div
                className={`p-4 rounded-lg border ${
                  message.type === "success"
                    ? "bg-green-500/20 border-green-500/30 text-green-300"
                    : message.type === "error"
                      ? "bg-red-500/20 border-red-500/30 text-red-300"
                      : "bg-blue-500/20 border-blue-500/30 text-blue-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  {message.type === "success" && (
                    <CheckCircle className="w-5 h-5" />
                  )}
                  {message.type === "error" && (
                    <AlertCircle className="w-5 h-5" />
                  )}
                  <span>{message.text}</span>
                </div>
              </div>
            )}

            {/* Action Buttons - Only show if escrow exists */}
            {!isLoadingData &&
              escrowData &&
              escrowData.escrowId &&
              escrowData.escrowId && (
                <div className="space-y-3">
                  {/* Approve Button */}
                  {!isApproved && (
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={
                        isLoading ||
                        !walletClient ||
                        !escrowData ||
                        !escrowData.escrowId ||
                        !topupAmount ||
                        parseFloat(topupAmount) <= 0
                      }
                      className={`w-full py-4 px-6 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
                        isLoading ||
                        !walletClient ||
                        !escrowData ||
                        !escrowData.escrowId ||
                        !topupAmount ||
                        parseFloat(topupAmount) <= 0
                          ? "bg-gray-500/50 text-gray-300 cursor-not-allowed"
                          : "bg-gradient-to-r from-orange-500 to-red-600 text-white hover:shadow-lg hover:shadow-orange-500/25 hover:scale-105"
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>Approving Tokens...</span>
                        </>
                      ) : !walletClient ? (
                        <>
                          <AlertCircle className="w-5 h-5" />
                          <span>
                            Wallet client not ready. Please try reconnecting your
                            wallet.
                          </span>
                        </>
                      ) : !escrowData || !escrowData.escrowId ? (
                        <>
                          <AlertCircle className="w-5 h-5" />
                          <span>Loading escrow data...</span>
                        </>
                      ) : !topupAmount || parseFloat(topupAmount) <= 0 ? (
                        <>
                          <AlertCircle className="w-5 h-5" />
                          <span>Please enter a valid amount</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          <span>Approve {topupAmount} {tokenType}</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Topup Button */}
                  {isApproved && (
                    <button
                      type="button"
                      onClick={handleTopup}
                      disabled={
                        isLoading ||
                        !walletClient ||
                        !escrowData ||
                        !escrowData.escrowId
                      }
                      className={`w-full py-4 px-6 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
                        isLoading ||
                        !walletClient ||
                        !escrowData ||
                        !escrowData.escrowId
                          ? "bg-gray-500/50 text-gray-300 cursor-not-allowed"
                          : "bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:shadow-lg hover:shadow-blue-500/25 hover:scale-105"
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>Processing Topup...</span>
                        </>
                      ) : !walletClient ? (
                        <>
                          <AlertCircle className="w-5 h-5" />
                          <span>
                            Wallet client not ready. Please try reconnecting your
                            wallet.
                          </span>
                        </>
                      ) : !escrowData || !escrowData.escrowId ? (
                        <>
                          <AlertCircle className="w-5 h-5" />
                          <span>Loading escrow data...</span>
                        </>
                      ) : (
                        <>
                          <DollarSign className="w-5 h-5" />
                          <span>Topup {topupAmount} {tokenType} to Escrow</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Status Message */}
                  {isApproved && (
                    <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
                      <div className="flex items-center space-x-2 text-green-300">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          Tokens approved! You can now proceed with topup.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Custom Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-8 max-w-md w-full text-center animate-pulse">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <h3 className="text-white text-xl font-semibold mb-2">
                  Topup Successfully!
                </h3>
                <p className="text-white/80 text-sm">
                  {topupAmount} {tokenType} has been added to your escrow
                </p>
              </div>
              <button
                onClick={() => setShowSuccessPopup(false)}
                className="px-6 py-2 bg-green-500/20 border border-green-500/30 rounded-lg text-green-300 hover:bg-green-500/30 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
