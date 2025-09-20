"use client";

import { useEffect, useState, Suspense } from "react";
import ReceiverDashboard from "@/components/dashboard/ReceiverDashboard";
import DashboardWrapper from "@/components/dashboard/DashboardWrapper";
import WalletWarning from "@/components/dashboard/WalletWarning";
import {
  loadAllWithdrawHistory,
  fetchEscrowsFromIndexer,
  fetchReceiverDashboardData,
} from "../api/api";
import { WithdrawHistory } from "@/types/historyTemplate";
import { useAuth } from "@/lib/userContext";
import { useWallet } from "@/lib/walletContext";
import GroupDashboard from "@/components/dashboard/GroupDashboard";
import MainLayout from "@/components/layout/MainLayout";
import { formatTokenAmount } from "@/lib/tokenMapping";

// Unified Dashboard Component with Filters
interface DynamicDashboardProps {
  userRole: "sender" | "receiver" | "none";
  effectiveWalletAddress: string;
  onRoleChange: () => void;
}

type FilterType = "all" | "created" | "claimable";

function DynamicDashboard({
  userRole,
  effectiveWalletAddress,
  onRoleChange,
}: DynamicDashboardProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [isCheckingData, setIsCheckingData] = useState(true);
  const [lastCheckedAddress, setLastCheckedAddress] = useState<string>("");
  const [senderEscrows, setSenderEscrows] = useState<any[]>([]);
  const [receiverData, setReceiverData] = useState<any>(null);
  const [allEscrows, setAllEscrows] = useState<any[]>([]);

  // Helper function to format token amount with proper decimals
  const formatTokenAmountWithDecimals = (amount: string, tokenType: string) => {
    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber)) return "0.00";

    // USDC and USDT use 6 decimals, IDRX uses 2 decimals
    const decimals = tokenType === "IDRX" ? 2 : 6;
    const divisor = Math.pow(10, decimals);
    const formattedAmount = amountNumber / divisor;

    return formattedAmount.toFixed(2); // Show 2 decimal places for display
  };

  useEffect(() => {
    const checkUserData = async () => {
      if (!effectiveWalletAddress) {
        setIsCheckingData(false);
        return;
      }

      // Only check if address has changed
      if (lastCheckedAddress === effectiveWalletAddress) {
        return;
      }

      setIsCheckingData(true);
      setLastCheckedAddress(effectiveWalletAddress);

      try {
        // Fetch all data in parallel (no connection test needed)
        const [senderEscrowsData, receiverDataResult] = await Promise.all([
          fetchEscrowsFromIndexer(effectiveWalletAddress),
          fetchReceiverDashboardData(effectiveWalletAddress),
        ]);

        // Set sender data
        setSenderEscrows(senderEscrowsData);

        // Set receiver data
        setReceiverData(receiverDataResult);

        // Combine all escrows for "all" filter
        const combinedEscrows = [
          ...senderEscrowsData.map((escrow: any) => ({
            ...escrow,
            type: "created",
          })),
          ...receiverDataResult.availableWithdrawals.map((escrow: any) => ({
            ...escrow,
            type: "claimable",
          })),
        ];

        console.log("📊 Combined escrows:", {
          totalCombined: combinedEscrows.length,
          createdCount: combinedEscrows.filter((e) => e.type === "created")
            .length,
          claimableCount: combinedEscrows.filter((e) => e.type === "claimable")
            .length,
          claimableEscrows: combinedEscrows.filter(
            (e) => e.type === "claimable",
          ),
          allEscrows: combinedEscrows,
        });

        setAllEscrows(combinedEscrows);
      } catch (error) {
        console.error("Error checking user data:", error);
        setSenderEscrows([]);
        setReceiverData(null);
        setAllEscrows([]);
      } finally {
        setIsCheckingData(false);
      }
    };

    checkUserData();
  }, [effectiveWalletAddress, lastCheckedAddress]);

  // Helper function to get claimable sender escrows (availableBalance >= totalAllocated)
  const getClaimableSenderEscrows = () => {
    return senderEscrows.filter((escrow) => {
      const availableBalance = parseFloat(escrow.availableBalance || "0");
      const totalAllocated = parseFloat(escrow.totalAmount || "0");
      return availableBalance >= totalAllocated;
    });
  };

  // Helper function to get total claimable escrows (sender + receiver)
  const getTotalClaimableCount = () => {
    const senderClaimableCount = getClaimableSenderEscrows().length;
    const receiverClaimableCount = allEscrows.filter(
      (escrow) => escrow.type === "claimable",
    ).length;
    return senderClaimableCount + receiverClaimableCount;
  };

  // Get filtered escrows based on active filter
  const getFilteredEscrows = () => {
    switch (activeFilter) {
      case "created":
        return senderEscrows;
      case "claimable":
        // Use the same data source as "all" but filter for claimable escrows
        const claimableEscrows = allEscrows.filter(
          (escrow) => escrow.type === "claimable",
        );
        console.log("🔍 Filtering claimable escrows:", {
          totalAllEscrows: allEscrows.length,
          claimableEscrows: claimableEscrows.length,
          claimableData: claimableEscrows,
        });
        return claimableEscrows;
      case "all":
      default:
        return allEscrows;
    }
  };

  const filteredEscrows = getFilteredEscrows();

  if (isCheckingData) {
    return (
      <div className="text-center mt-20">
        <div className="inline-flex items-center space-x-2 text-gray-400">
          <div className="w-6 h-6 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin"></div>
          <span>Checking your escrows...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Your Dashboard</h1>
        <p className="text-gray-400">
          Manage your escrows and claim your payments
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex justify-center mb-8">
        <div className="bg-white/5 border border-white/10 rounded-xl p-1 flex">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-6 py-3 rounded-lg text-sm font-medium transition-all ${
              activeFilter === "all"
                ? "bg-cyan-400 text-black"
                : "text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            All Escrows ({allEscrows.length})
          </button>
          <button
            onClick={() => setActiveFilter("created")}
            className={`px-6 py-3 rounded-lg text-sm font-medium transition-all ${
              activeFilter === "created"
                ? "bg-cyan-400 text-black"
                : "text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            Created ({senderEscrows.length})
          </button>
          <button
            onClick={() => setActiveFilter("claimable")}
            className={`px-6 py-3 rounded-lg text-sm font-medium transition-all ${
              activeFilter === "claimable"
                ? "bg-cyan-400 text-black"
                : "text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            Claimable ({getTotalClaimableCount()})
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <span className="w-2 h-2 bg-cyan-400 rounded-full mr-3"></span>
            {activeFilter === "all" && "All Escrows"}
            {activeFilter === "created" && "Escrows You Created"}
            {activeFilter === "claimable" && "Claimable Escrows"}
          </h2>
          <span className="px-3 py-1 bg-cyan-400/20 text-cyan-400 text-sm rounded-full">
            {activeFilter === "claimable"
              ? getTotalClaimableCount()
              : filteredEscrows.length}{" "}
            found
          </span>
        </div>

        {/* Content based on filter */}
        {activeFilter === "created" && (
          <GroupDashboard onRoleChange={onRoleChange} />
        )}

        {activeFilter === "claimable" && (
          <>
            {(() => {
              console.log("🔍 Rendering claimable filter - Sender POV only:", {
                claimableSenderEscrows: getClaimableSenderEscrows().length,
                totalSenderEscrows: senderEscrows.length,
                isLoading: isCheckingData,
              });
              return null;
            })()}

            {/* Show both sender claimable escrows AND receiver claimable escrows */}
            <div className="space-y-6">
              {/* Sender Claimable Escrows */}
              {getClaimableSenderEscrows().length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-white mb-3 flex items-center">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></span>
                    Your Created Escrows Ready for Recipients (
                    {getClaimableSenderEscrows().length})
                  </h4>
                  <GroupDashboard
                    onRoleChange={onRoleChange}
                    viewMode="claimable-sender"
                    claimableEscrows={getClaimableSenderEscrows()}
                  />
                </div>
              )}

              {/* Receiver Claimable Escrows - New card format */}
              {allEscrows.filter((escrow) => escrow.type === "claimable")
                .length > 0 ? (
                <div>
                  <h4 className="text-md font-medium text-white mb-3 flex items-center">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2"></span>
                    Ready to Claim from Others (
                    {
                      allEscrows.filter((escrow) => escrow.type === "claimable")
                        .length
                    }
                    )
                  </h4>
                  <div className="space-y-4">
                    {allEscrows
                      .filter((escrow) => escrow.type === "claimable")
                      .map((escrow, index) => (
                        <div
                          key={`claimable-${escrow.escrowId}-${index}`}
                          className="bg-white/5 rounded-lg p-4 border border-white/10"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
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
                                  {formatTokenAmountWithDecimals(
                                    escrow.availableAmount || "0",
                                    escrow.originCurrency || "IDRX",
                                  )}{" "}
                                  {escrow.originCurrency} available
                                </p>
                                <p className="text-white/40 text-xs">
                                  Escrow ID: {escrow.escrowId?.slice(0, 8)}...
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                <span className="text-green-400 text-sm">
                                  Claimable
                                </span>
                              </div>
                              <button
                                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all hover:scale-105"
                                onClick={() => {
                                  // Handle claim action here
                                  console.log("Claiming escrow:", escrow);
                                }}
                              >
                                Claim Now
                              </button>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-white/60">
                                  Total Allocated:
                                </span>
                                <div className="text-white">
                                  {formatTokenAmountWithDecimals(
                                    escrow.allocatedAmount || "0",
                                    escrow.originCurrency || "IDRX",
                                  )}{" "}
                                  {escrow.originCurrency}
                                </div>
                              </div>
                              <div>
                                <span className="text-white/60">
                                  Available:
                                </span>
                                <div className="text-white">
                                  {formatTokenAmountWithDecimals(
                                    escrow.availableAmount || "0",
                                    escrow.originCurrency || "IDRX",
                                  )}{" "}
                                  {escrow.originCurrency}
                                </div>
                              </div>
                              <div>
                                <span className="text-white/60">Created:</span>
                                <div className="text-white">
                                  {escrow.createdAt
                                    ? new Date(
                                        escrow.createdAt,
                                      ).toLocaleDateString()
                                    : "N/A"}
                                </div>
                              </div>
                              <div>
                                <span className="text-white/60">Status:</span>
                                <div className="text-green-400">
                                  Ready to Claim
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">⏳</span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    No Claimable Escrows
                  </h3>
                  <p className="text-white/60 mb-4">
                    None of your received escrows are ready to be claimed yet.
                  </p>
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 max-w-md mx-auto">
                    <h4 className="text-orange-400 font-medium mb-2">
                      Escrows become claimable when:
                    </h4>
                    <ul className="text-orange-300/80 text-sm space-y-1 text-left">
                      <li>• Sender has funded the escrow sufficiently</li>
                      <li>• Available balance ≥ Your allocated amount</li>
                      <li>• You can then claim your allocated funds</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* No claimable escrows at all */}
              {getClaimableSenderEscrows().length === 0 &&
                allEscrows.filter((escrow) => escrow.type === "claimable")
                  .length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">⏳</span>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      No Claimable Escrows
                    </h3>
                    <p className="text-white/60 mb-4">
                      You don't have any escrows ready to be claimed yet.
                    </p>
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 max-w-md mx-auto">
                      <h4 className="text-orange-400 font-medium mb-2">
                        Escrows become claimable when:
                      </h4>
                      <ul className="text-orange-300/80 text-sm space-y-1 text-left">
                        <li>
                          • Created escrows: Available balance ≥ Total allocated
                          amount
                        </li>
                        <li>
                          • Received escrows: Sender has funded sufficiently
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
            </div>
          </>
        )}

        {activeFilter === "all" && (
          <div className="space-y-4">
            {/* Created Escrows Section */}
            {senderEscrows.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-white mb-3 flex items-center">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full mr-2"></span>
                  Created by You ({senderEscrows.length})
                </h3>
                <div className="bg-white/5 rounded-lg p-4">
                  <GroupDashboard onRoleChange={onRoleChange} />
                </div>
              </div>
            )}

            {/* Claimable Escrows Section - Show all received escrows using ReceiverDashboard */}
            <div>
              <h3 className="text-lg font-medium text-white mb-3 flex items-center">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2"></span>
                Available to Claim (
                {
                  allEscrows.filter((escrow) => escrow.type === "claimable")
                    .length
                }
                )
              </h3>
              <div className="bg-white/5 rounded-lg p-4">
                <ReceiverDashboard
                  incomingTransactions={allEscrows.filter(
                    (escrow) => escrow.type === "claimable",
                  )}
                  isLoading={isCheckingData}
                />
              </div>
            </div>

            {/* No data message */}
            {allEscrows.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📋</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  No Escrows Found
                </h3>
                <p className="text-white/60">
                  You haven't created any escrows or received any payments yet.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === "development" && (
        <div className="bg-gray-800/50 border border-gray-600 rounded-xl p-4 text-xs text-gray-400">
          <h3 className="text-white mb-2">Debug Info:</h3>
          <div>Wallet: {effectiveWalletAddress}</div>
          <div>Active Filter: {activeFilter}</div>
          <div>Created Escrows: {senderEscrows.length}</div>
          <div>
            Claimable Escrows:{" "}
            {allEscrows.filter((escrow) => escrow.type === "claimable").length}
          </div>
          <div>Total Escrows: {allEscrows.length}</div>
          <div>Filtered Results: {filteredEscrows.length}</div>
        </div>
      )}
    </div>
  );
}

function DashboardContent() {
  const { user, loading, authenticated, currentWalletAddress } = useAuth();
  const { isConnected, address } = useWallet();

  const [userRole, setUserRole] = useState<"sender" | "receiver" | "none">(
    "none",
  );
  const [roleLoading, setRoleLoading] = useState(false);
  const [withdrawHistory, setWithdrawHistory] = useState<WithdrawHistory[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const effectiveWalletAddress = currentWalletAddress || address || "";

  // Dynamic role detection based on wallet connection
  useEffect(() => {
    const determineRole = async () => {
      if (!user?._id || !effectiveWalletAddress) {
        return;
      }

      setRoleLoading(true);
    };

    determineRole();
  }, [user?._id, effectiveWalletAddress]);

  // Fetch withdraw history untuk receiver
  useEffect(() => {
    if (
      loading ||
      !user?._id ||
      !currentWalletAddress ||
      hasFetched ||
      userRole !== "receiver"
    )
      return;

    const fetchWithdrawHistory = async () => {
      setWithdrawLoading(true);
      try {
        const historyTemplate = await loadAllWithdrawHistory(
          user._id,
          currentWalletAddress,
        );
        if (!historyTemplate || !Array.isArray(historyTemplate)) {
          console.warn("Withdraw history not found or not an array.");
          setWithdrawHistory([]);
          setHasFetched(true);
          return;
        }

        const templatesWithdrawHistory: WithdrawHistory[] = historyTemplate.map(
          (w: any) => ({
            withdrawId: w.withdrawId,
            receiverId: w.receiverId,
            amount: w.amount,
            choice: w.choice,
            originCurrency: w.originCurrency,
            targetCurrency: w.targetCurrency ?? "",
            networkChainId: w.networkChainId ?? "",
            walletAddress: w.walletAddress ?? "",
            depositWalletAddress: w.depositWalletAddress ?? "",
            bankId: w.bankId ?? "",
            bankName: w.bankName ?? "",
            bankAccountName: w.bankAccountName ?? "",
            bankAccountNumber: w.bankAccountNumber ?? "",
          }),
        );
        setWithdrawHistory(templatesWithdrawHistory);
        setHasFetched(true);
      } catch (err) {
        console.error("Failed to fetch withdraw history", err);
      } finally {
        setWithdrawLoading(false);
      }
    };

    fetchWithdrawHistory();
  }, [loading, user, currentWalletAddress, hasFetched, userRole]);

  // Reset hasFetched ketika currentWalletAddress berubah
  useEffect(() => {
    setHasFetched(false);
    setWithdrawHistory([]);
  }, [currentWalletAddress]);

  const refreshUserRole = async () => {
    if (!user?._id || !effectiveWalletAddress) return;

    setRoleLoading(true);
  };

  // Show loading state
  if (loading) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </section>
    );
  }

  return (
    <MainLayout>
      <div className="px-4 py-6 min-h-[calc(100vh-9rem)]">
        <div className="container mx-auto">
          {!isConnected || !address ? (
            <WalletWarning />
          ) : !effectiveWalletAddress ? (
            <div className="text-center py-12">
              <p className="text-gray-400">Connecting wallet...</p>
            </div>
          ) : roleLoading ? (
            <div className="text-center mt-20">
              <div className="inline-flex items-center space-x-2 text-gray-400">
                <div className="w-6 h-6 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin"></div>
                <span>Loading dashboard...</span>
              </div>
            </div>
          ) : (
            <DynamicDashboard
              userRole={userRole}
              effectiveWalletAddress={effectiveWalletAddress}
              onRoleChange={refreshUserRole}
            />
          )}
        </div>
      </div>
    </MainLayout>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <section className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading dashboard...</p>
          </div>
        </section>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
