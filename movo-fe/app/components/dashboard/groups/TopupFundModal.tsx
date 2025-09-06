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
import { loadSpecifiedGroup } from "@/app/api/api";
import {
  topUpFunds,
  checkTokenBalance,
  checkTokenAllowance,
  approveTokens,
} from "@/lib/smartContract";
import { formatTokenAmount, parseTokenAmount } from "@/lib/smartContract";
import { useAuth } from "@/lib/userContext";

interface TopupFundModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
}

export default function TopupFundModal({
  isOpen,
  onClose,
  groupId,
}: TopupFundModalProps) {
  const { user } = useAuth();

  const walletClient = useWalletClientHook();
  const { isConnected, address } = useWallet();
  const [groupData, setGroupData] = useState<any>(null);
  const [topupAmount, setTopupAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [tokenBalance, setTokenBalance] = useState<string>("0");
  const [tokenAllowance, setTokenAllowance] = useState<string>("0");

  useEffect(() => {
    if (isOpen && groupId && user?._id) {
      const fetchData = async () => {
        setIsLoadingData(true);
        try {
          const groupResult = await loadSpecifiedGroup(user._id, groupId);
          if (groupResult) {
            setGroupData(groupResult);
          } else {
            setGroupData(null);
          }
        } catch (error) {
          console.error("Error loading group data:", error);
          setMessage({
            type: "error",
            text: "Failed to load group data. Please try again.",
          });
          setGroupData(null);
        } finally {
          setIsLoadingData(false);
        }
      };
      fetchData();
    }
  }, [isOpen, groupId, user?._id]);

  // Check token balance and allowance when group data changes
  useEffect(() => {
    if (isConnected && address && groupData && groupData.escrowId) {
      checkTokenInfo();
    }
  }, [isConnected, address, groupData]);

  const checkTokenInfo = async () => {
    if (!groupData || !groupData.escrowId) return;

    try {
      const balance = await checkTokenBalance(
        groupData.originCurrency,
        address!,
      );
      const allowance = await checkTokenAllowance(
        groupData.originCurrency,
        address!,
        groupData.escrowId,
      );

      setTokenBalance(
        formatTokenAmount(balance, groupData.originCurrency === "USDC" ? 6 : 2),
      );
      setTokenAllowance(
        formatTokenAmount(
          allowance,
          groupData.originCurrency === "USDC" ? 6 : 2,
        ),
      );
    } catch (error) {
      console.error("Error checking token info:", error);
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

    if (!groupData || !groupData.escrowId) {
      setMessage({
        type: "error",
        text: "Escrow data not found. Please try again.",
      });
      return;
    }

    // Validate escrow address format
    if (!groupData.escrowId) {
      setMessage({
        type: "error",
        text: "Invalid escrow contract address. Please check your escrow setup.",
      });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const parsedAmount = parseTokenAmount(
        topupAmount,
        groupData.originCurrency === "USDC" ? 6 : 2,
      );

      // Check if user has enough balance
      const userBalance = await checkTokenBalance(
        groupData.originCurrency,
        address,
      );
      if (userBalance < parsedAmount) {
        throw new Error(
          `Insufficient balance. You have ${formatTokenAmount(userBalance, groupData.originCurrency === "USDC" ? 6 : 2)} ${groupData.originCurrency}`,
        );
      }
      console.log(groupData.escrowId);

      const currentAllowance = await checkTokenAllowance(
        groupData.originCurrency,
        address,
        groupData.escrowId,
        // groupData.escrowId,
      );
      console.log(currentAllowance);
      console.log(parsedAmount);

      if (currentAllowance <= parsedAmount) {
        // Need to approve first
        const approvalSuccess = await approveTokens(
          walletClient,
          groupData.originCurrency,
          groupData.escrowId,
          parsedAmount,
        );
        console.log(approvalSuccess);

        if (!approvalSuccess) {
          throw new Error("Failed to approve tokens for escrow contract");
        }
      }

      // Perform topup
      const result = await topUpFunds(
        walletClient,
        groupData.escrowId,
        parsedAmount,
        groupData.originCurrency,
      );

      if (result.success) {
        setMessage({
          type: "success",
          text: `Topup successful! Added ${topupAmount} ${groupData.originCurrency} to escrow. Transaction: ${result.transactionHash}`,
        });

        // Reset form and refresh data
        setTopupAmount("");
        setTimeout(() => {
          // Refresh the group data after successful topup
          const refreshData = async () => {
            const groupResult = await loadSpecifiedGroup(user._id, groupId);
            if (groupResult) {
              setGroupData(groupResult);
            }
          };
          refreshData();
          checkTokenInfo();
        }, 2000);
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
    setGroupData(null);
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
              Topup Fund to Escrow
            </h3>
            <p className="text-white/60 text-sm mt-1">
              Add funds to your escrow for receiver withdrawals
            </p>
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
                <span className="text-white/60">Loading group data...</span>
              </div>
            )}

            {/* No Escrow Message */}
            {!isLoadingData &&
              (!groupData ||
                !groupData.escrowId ||
                !groupData.escrowId ||
                "") && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
                  <div className="flex items-center space-x-3 text-yellow-300 mb-4">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">
                      {!groupData
                        ? "No group data found"
                        : !groupData.escrowId
                          ? "No escrow found for this group"
                          : "Invalid escrow contract address"}
                    </span>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg">
                    {!groupData || !groupData.escrowId ? (
                      <>
                        <p className="text-white/60 text-sm mb-3">
                          To enable topup functionality, you need to:
                        </p>
                        <ol className="text-white/60 text-sm space-y-2 list-decimal list-inside">
                          <li>Enter the group by clicking on the group row</li>
                          <li>Click "Create Escrow Streams" button</li>
                          <li>Fill in receiver details and create escrow</li>
                          <li>Come back here to topup funds</li>
                        </ol>
                      </>
                    ) : (
                      <>
                        <p className="text-white/60 text-sm mb-3">
                          The escrow contract address is invalid:
                        </p>
                        <p className="text-white/80 text-xs font-mono bg-white/10 p-2 rounded break-all">
                          {groupData.escrowId}
                        </p>
                        <p className="text-white/60 text-sm mt-3">
                          Please contact support or recreate the escrow with a
                          valid contract address.
                        </p>
                      </>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="mt-4 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-300 hover:bg-yellow-500/30 transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}

            {/* Escrow Information - Only show if escrow exists */}
            {!isLoadingData &&
              groupData &&
              groupData.escrowId &&
              groupData.escrowId && (
                <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-4">
                  <h4 className="text-cyan-300 font-medium mb-3">
                    Escrow Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-white/60">Token Type</p>
                      <p className="text-white font-medium">
                        {groupData.originCurrency}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/60">Escrow ID</p>
                      <p className="text-white font-mono text-xs break-all">
                        {groupData.escrowId}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/60">Total Allocated</p>
                      <p className="text-white font-medium">
                        {groupData.totalAmount} {groupData.originCurrency}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/60">Receivers</p>
                      <p className="text-white font-medium">
                        {groupData.Receivers?.length || 0} addresses
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {/* Topup Amount Input - Only show if escrow exists */}
            {!isLoadingData &&
              groupData &&
              groupData.escrowId &&
              groupData.escrowId && (
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Topup Amount ({groupData?.originCurrency || "Token"})
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
                      {groupData?.originCurrency || "Token"}
                    </div>
                  </div>
                </div>
              )}

            {/* Token Info - Only show if escrow exists and wallet connected */}
            {!isLoadingData &&
              isConnected &&
              address &&
              groupData &&
              groupData.escrowId && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-white/5 border border-white/10 rounded-lg">
                  <div>
                    <p className="text-white/60 text-xs mb-1">Your Balance</p>
                    <p className="text-white font-medium">
                      {tokenBalance} {groupData.originCurrency}
                    </p>
                  </div>
                  <div>
                    <p className="text-white/60 text-xs mb-1">Allowance</p>
                    <p className="text-white font-medium">
                      {tokenAllowance} {groupData.originCurrency}
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

            {/* Submit Button - Only show if escrow exists */}
            {!isLoadingData &&
              groupData &&
              groupData.escrowId &&
              groupData.escrowId && (
                <button
                  type="button"
                  onClick={handleTopup}
                  disabled={
                    isLoading ||
                    !walletClient ||
                    !groupData ||
                    !groupData.escrowId
                  }
                  className={`w-full py-4 px-6 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
                    isLoading ||
                    !walletClient ||
                    !groupData ||
                    !groupData.escrowId
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
                  ) : !groupData || !groupData.escrowId ? (
                    <>
                      <AlertCircle className="w-5 h-5" />
                      <span>Loading escrow data...</span>
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-5 h-5" />
                      <span>Topup Fund to Escrow</span>
                    </>
                  )}
                </button>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
