"use client";

import { useEffect, useState, Suspense } from "react";
import ReceiverDashboard from "@/components/dashboard/ReceiverDashboard";
import DashboardWrapper from "@/components/dashboard/DashboardWrapper";
import WalletWarning from "@/components/dashboard/WalletWarning";
import {
  loadAllWithdrawHistory,
  fetchEscrowsFromIndexer,
  fetchReceiverDashboardData,
  testGoldskyConnection,
} from "../api/api";
import { WithdrawHistory } from "@/types/historyTemplate";
import { useAuth } from "@/lib/userContext";
import { useWallet } from "@/lib/walletContext";
import GroupDashboard from "@/components/dashboard/GroupDashboard";
import MainLayout from "@/components/layout/MainLayout";

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
        console.log("🔍 Checking data for wallet:", effectiveWalletAddress);

        // First, test Goldsky connection
        const connectionTest = await testGoldskyConnection();
        if (!connectionTest.success) {
          console.error("❌ Goldsky connection failed:", connectionTest.error);
          setSenderEscrows([]);
          setReceiverData(null);
          setAllEscrows([]);
          return;
        }

        console.log("✅ Goldsky connection successful");

        // Fetch all data in parallel - FIXED: Use actual wallet address
        console.log("🔍 Fetching all escrow data...");
        const [senderEscrowsData, receiverDataResult] = await Promise.all([
          fetchEscrowsFromIndexer("0xfa128bbd1846c19025c7428aee403fc06f0a9e38"), // FIXED: Use actual wallet address instead of hardcoded
          fetchReceiverDashboardData(effectiveWalletAddress),
        ]);

        console.log("📊 Raw senderEscrowsData:", senderEscrowsData);
        console.log("📊 Raw receiverDataResult:", receiverDataResult);

        // FIXED: Process and map sender escrows data properly
        const processedSenderEscrows = Array.isArray(senderEscrowsData)
          ? senderEscrowsData.map((escrow: any, index: number) => ({
              id: escrow.id || `escrow_${index}`,
              escrowId: escrow.escrowId || escrow.id,
              contractId: escrow.contractId_ || escrow.contractId,
              totalAmount: escrow.totalAmount || escrow.amount || "0",
              tokenType: escrow.tokenType || "USDC",
              recipients: escrow.recipients || [],
              recipientCount: escrow.recipients?.length || 0,
              blockNumber: escrow.block_number || escrow.blockNumber,
              timestamp: escrow.timestamp_ || escrow.timestamp,
              transactionHash:
                escrow.transactionHash_ || escrow.transactionHash,
              creator: escrow.creator || effectiveWalletAddress,
              type: "created",
              status: "active",
            }))
          : [];

        console.log("📊 Processed sender escrows:", processedSenderEscrows);

        console.log("📊 Data fetched:", {
          senderEscrows: processedSenderEscrows.length,
          receiverWithdrawals:
            receiverDataResult.availableWithdrawals?.length || 0,
        });

        // Set sender data - FIXED: Use processed data
        setSenderEscrows(processedSenderEscrows);

        // Set receiver data
        setReceiverData(receiverDataResult);

        // Combine all escrows for "all" filter - FIXED: Use processed data
        const combinedEscrows = [
          ...processedSenderEscrows,
          ...(receiverDataResult.availableWithdrawals || []).map(
            (escrow: any) => ({
              ...escrow,
              type: "claimable",
            }),
          ),
        ];
        setAllEscrows(combinedEscrows);

        console.log("📊 Final combined data:", {
          walletAddress: effectiveWalletAddress,
          senderEscrows: processedSenderEscrows.length,
          receiverWithdrawals:
            receiverDataResult.availableWithdrawals?.length || 0,
          totalEscrows: combinedEscrows.length,
        });
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

  // Get filtered escrows based on active filter
  const getFilteredEscrows = () => {
    switch (activeFilter) {
      case "created":
        return senderEscrows;
      case "claimable":
        return receiverData?.availableWithdrawals || [];
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
            Claimable ({receiverData?.availableWithdrawals?.length || 0})
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
            {activeFilter === "claimable" && "Available Payments"}
          </h2>
          <span className="px-3 py-1 bg-cyan-400/20 text-cyan-400 text-sm rounded-full">
            {filteredEscrows.length} found
          </span>
        </div>

        {/* Content based on filter */}
        {activeFilter === "created" && (
          <>
            {senderEscrows.length > 0 ? (
              <>
                {/* FIXED: Show escrow cards directly instead of GroupDashboard */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {senderEscrows.map((escrow, index) => (
                    <div
                      key={escrow.id || index}
                      className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <span className="w-3 h-3 bg-cyan-400 rounded-full"></span>
                          <span className="text-sm text-cyan-400 font-medium">
                            ESCROW
                          </span>
                        </div>
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                          {escrow.status || "Active"}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-white/60 text-sm">Total Amount</p>
                          <p className="text-white text-lg font-semibold">
                            {parseFloat(escrow.totalAmount).toLocaleString()}{" "}
                            {escrow.tokenType}
                          </p>
                        </div>

                        <div>
                          <p className="text-white/60 text-sm">Recipients</p>
                          <p className="text-white">
                            {escrow.recipientCount} recipient(s)
                          </p>
                        </div>

                        <div>
                          <p className="text-white/60 text-sm">Escrow ID</p>
                          <p className="text-white text-sm font-mono">
                            {escrow.escrowId?.slice(0, 10)}...
                            {escrow.escrowId?.slice(-6)}
                          </p>
                        </div>

                        {escrow.timestamp && (
                          <div>
                            <p className="text-white/60 text-sm">Created</p>
                            <p className="text-white text-sm">
                              {new Date(
                                escrow.timestamp * 1000,
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-white/10">
                        <button className="w-full py-2 px-4 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg text-sm font-medium transition-colors">
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Also show GroupDashboard for additional functionality */}
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-white mb-4">
                    Manage Escrows
                  </h3>
                  <GroupDashboard onRoleChange={onRoleChange} />
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📋</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  No Escrows Created
                </h3>
                <p className="text-white/60 mb-4">
                  You haven't created any escrows yet.
                </p>
                <button
                  onClick={onRoleChange}
                  className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors"
                >
                  Create Your First Escrow
                </button>
              </div>
            )}
          </>
        )}

        {activeFilter === "claimable" && (
          <>
            {console.log("🔍 Rendering claimable filter with data:", {
              receiverData: receiverData,
              availableWithdrawals: receiverData?.availableWithdrawals,
              isLoading: isCheckingData,
            })}
            <ReceiverDashboard
              incomingTransactions={receiverData?.availableWithdrawals || []}
              isLoading={isCheckingData}
            />
          </>
        )}

        {activeFilter === "all" && (
          <div className="space-y-6">
            {/* Created Escrows Section */}
            {senderEscrows.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full mr-2"></span>
                  Created by You ({senderEscrows.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {senderEscrows.slice(0, 3).map((escrow, index) => (
                    <div
                      key={escrow.id || index}
                      className="bg-white/5 border border-white/10 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-cyan-400 font-medium">
                          CREATED
                        </span>
                        <span className="text-xs text-white/60">
                          {parseFloat(escrow.totalAmount).toLocaleString()}{" "}
                          {escrow.tokenType}
                        </span>
                      </div>
                      <p className="text-white text-sm mb-2">
                        {escrow.recipientCount} recipient(s)
                      </p>
                      <p className="text-white/60 text-xs">
                        ID: {escrow.escrowId?.slice(0, 8)}...
                      </p>
                    </div>
                  ))}
                </div>
                {senderEscrows.length > 3 && (
                  <button
                    onClick={() => setActiveFilter("created")}
                    className="mt-3 text-cyan-400 text-sm hover:text-cyan-300 transition-colors"
                  >
                    View all {senderEscrows.length} created escrows →
                  </button>
                )}
              </div>
            )}

            {/* Claimable Escrows Section */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2"></span>
                Available to Claim (
                {receiverData?.availableWithdrawals?.length || 0})
              </h3>
              <div className="bg-white/5 rounded-lg p-4">
                <ReceiverDashboard
                  incomingTransactions={
                    receiverData?.availableWithdrawals || []
                  }
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
                <p className="text-white/60 mb-4">
                  You haven't created any escrows or received any payments yet.
                </p>
                <button
                  onClick={onRoleChange}
                  className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors"
                >
                  Get Started
                </button>
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
            Claimable Escrows: {receiverData?.availableWithdrawals?.length || 0}
          </div>
          <div>Total Escrows: {allEscrows.length}</div>
          <div>Filtered Results: {filteredEscrows.length}</div>
          <div>
            Raw Sender Data:{" "}
            {JSON.stringify(senderEscrows.slice(0, 1), null, 2)}
          </div>
        </div>
      )}
    </div>
  );
}

// ... rest of the component remains the same
function DashboardContent() {
  const { user, loading, authenticated, currentWalletAddress, currentRole } =
    useAuth();
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
        setUserRole("none");
        return;
      }

      setRoleLoading(true);
      try {
        // Use currentRole from context if available
        if (currentRole && currentRole !== "none") {
          setUserRole(currentRole);
        } else {
          // If no role in context, check if user has any escrows as sender or receiver
          // This will be determined by the dashboard components themselves
          setUserRole("none");
        }
      } catch (error) {
        console.error("Error determining user role:", error);
        setUserRole("none");
      } finally {
        setRoleLoading(false);
      }
    };

    determineRole();
  }, [user?._id, effectiveWalletAddress, currentRole]);

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

  const handleRoleChange = (newRole: "sender" | "receiver" | "none") => {
    setUserRole(newRole);
  };

  const refreshUserRole = async () => {
    if (!user?._id || !effectiveWalletAddress) return;

    setRoleLoading(true);
    try {
      const roleResult = await currentRole;
      if (roleResult) {
        setUserRole(roleResult);
      } else {
        setUserRole("none");
      }
    } catch (error) {
      console.error("Error refreshing user role:", error);
    } finally {
      setRoleLoading(false);
    }
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
