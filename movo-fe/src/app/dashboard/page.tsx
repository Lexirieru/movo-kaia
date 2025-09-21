"use client";

import { useEffect, useState, Suspense } from "react";
import ReceiverDashboard from "@/components/dashboard/ReceiverDashboard";
import DashboardWrapper from "@/components/dashboard/DashboardWrapper";
import WalletWarning from "@/components/dashboard/WalletWarning";
import ClaimModal from "@/components/dashboard/ClaimModal";
import {
  loadAllWithdrawHistory,
  fetchEscrowsFromIndexer,
  fetchReceiverDashboardData,
  fetchAllReceiverDashboardData,
  getReceiverVestingInfo,
  calculateVestedAmount,
  getVestingTimeline,
  isVestingEnabled,
  formatVestingAmount,
  VestingInfo,
  ReceiverVestingInfo,
  TokenType,
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
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [selectedEscrowForClaim, setSelectedEscrowForClaim] =
    useState<any>(null);

  // Vesting state management
  const [vestingInfoMap, setVestingInfoMap] = useState<Map<string, any>>(
    new Map(),
  );
  const [isLoadingVesting, setIsLoadingVesting] = useState(false);

  // Helper function to format token amount with proper decimals
  const formatTokenAmountWithDecimals = (amount: string, tokenType: string) => {
    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber)) return "0.00";

    let formattedAmount = amountNumber;

    // Handle decimal conversion based on token type
    if (tokenType === "USDC" || tokenType === "USDT") {
      // USDC/USDT use 6 decimals, divide by 10^6 if raw value
      if (amountNumber > 10000) {
        formattedAmount = amountNumber / 1000000;
      }
    } else if (tokenType === "IDRX") {
      // IDRX uses 2 decimals, divide by 10^2 if raw value
      if (amountNumber > 10000) {
        formattedAmount = amountNumber / 100;
      }
    }

    return formattedAmount.toFixed(2); // Show 2 decimal places for display
  };

  // Function to load vesting information for receiver escrows
  const loadVestingInfo = async (escrows: any[]) => {
    setIsLoadingVesting(true);
    const newVestingMap = new Map();

    try {
      // Load vesting info for each escrow that the receiver has
      const vestingPromises = escrows.map(async (escrow) => {
        try {
          const escrowKey = `${escrow.escrowId}-${effectiveWalletAddress}`;

          // Map token type to our TokenType format
          let tokenType: TokenType = "USDC"; // default
          if (escrow.originCurrency === "IDRX") {
            tokenType = "IDRX_BASE"; // assume IDRX_BASE as default IDRX
          } else if (escrow.originCurrency === "USDT") {
            tokenType = "USDT";
          } else if (escrow.originCurrency === "USDC") {
            tokenType = "USDC";
          }

          // Check if vesting is enabled for this escrow
          const vestingEnabled = await isVestingEnabled(
            escrow.escrowId,
            tokenType,
          );

          if (!vestingEnabled) {
            console.log(`⚠️ Vesting not enabled for escrow ${escrow.escrowId}`);
            return null;
          }

          console.log(
            `🔍 Loading vesting info for escrow ${escrow.escrowId} with token ${tokenType}`,
          );

          // Get receiver vesting info
          const receiverVestingInfo = await getReceiverVestingInfo(
            escrow.escrowId,
            effectiveWalletAddress,
            tokenType,
          );

          // Get vesting timeline
          const vestingTimeline = await getVestingTimeline(
            escrow.escrowId,
            tokenType,
          );

          // Calculate vested amount
          const vestedAmountData = await calculateVestedAmount(
            escrow.escrowId,
            effectiveWalletAddress,
            tokenType,
          );

          if (receiverVestingInfo && vestingTimeline) {
            const vestingData = {
              escrowId: escrow.escrowId,
              tokenType,
              receiverVestingInfo,
              vestingTimeline,
              vestedAmountData,
              // Additional computed properties
              totalAllocated: BigInt(escrow.allocatedAmount || "0"),
              availableToWithdraw: receiverVestingInfo.availableToClaim,
              vestingProgress:
                Number(receiverVestingInfo.vestingProgress) / 100, // Convert from basis points to percentage
              isVestingActive: vestingTimeline.status === "IN_PROGRESS",
              isVestingCompleted: vestingTimeline.status === "COMPLETED",
            };

            console.log(
              `✅ Vesting info loaded for ${escrow.escrowId}:`,
              vestingData,
            );
            return { key: escrowKey, data: vestingData };
          }
        } catch (error) {
          console.error(
            `❌ Error loading vesting info for escrow ${escrow.escrowId}:`,
            error,
          );
        }
        return null;
      });

      const vestingResults = await Promise.all(vestingPromises);

      // Add results to map
      vestingResults.forEach((result) => {
        if (result) {
          newVestingMap.set(result.key, result.data);
        }
      });

      console.log(`📊 Loaded vesting info for ${newVestingMap.size} escrows`);
      setVestingInfoMap(newVestingMap);
    } catch (error) {
      console.error("❌ Error loading vesting info:", error);
    } finally {
      setIsLoadingVesting(false);
    }
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
        // Use fetchAllReceiverDashboardData to get ALL escrows including non-claimable
        const [senderEscrowsData, receiverDataResult] = await Promise.all([
          fetchEscrowsFromIndexer(effectiveWalletAddress),
          fetchAllReceiverDashboardData(effectiveWalletAddress),
        ]);

        // Debug: Log sender escrows data with detailed token information
        console.log("🔍 DEBUG: Sender escrows data received:", {
          totalEscrows: senderEscrowsData.length,
          escrows: senderEscrowsData.map((escrow: any) => ({
            escrowId: escrow.escrowId,
            tokenType: escrow.tokenType,
            dataSource: escrow.dataSource,
            availableBalance: escrow.availableBalance,
            totalAmount: escrow.totalAmount,
            tokenAddress: escrow.tokenAddress,
          })),
        });

        // Set sender data
        setSenderEscrows(senderEscrowsData);

        // Set receiver data
        setReceiverData(receiverDataResult);

        // Combine all escrows for "all" filter
        // Use allEscrows from receiver data to include ALL received escrows (claimable + pending)
        const combinedEscrows = [
          ...senderEscrowsData.map((escrow: any) => ({
            ...escrow,
            type: "created",
          })),
          ...receiverDataResult.allEscrows.map((escrow: any) => ({
            ...escrow,
            type: escrow.canClaim ? "claimable" : "pending",
          })),
        ];

        console.log("📊 Combined escrows:", {
          totalCombined: combinedEscrows.length,
          createdCount: combinedEscrows.filter((e) => e.type === "created")
            .length,
          claimableCount: combinedEscrows.filter((e) => e.type === "claimable")
            .length,
          pendingCount: combinedEscrows.filter((e) => e.type === "pending")
            .length,
          receiverDataSummary: {
            totalAllEscrows: receiverDataResult.allEscrows?.length || 0,
            availableWithdrawals:
              receiverDataResult.availableWithdrawals?.length || 0,
            totalAllocated: receiverDataResult.totalAllocated || "0",
            totalAvailable: receiverDataResult.totalAvailable || "0",
          },
          claimableEscrows: combinedEscrows.filter(
            (e) => e.type === "claimable",
          ),
          pendingEscrows: combinedEscrows.filter((e) => e.type === "pending"),
          allEscrows: combinedEscrows,
        });

        setAllEscrows(combinedEscrows);

        // Load vesting information for receiver escrows
        const receiverEscrows = receiverDataResult.allEscrows || [];
        if (receiverEscrows.length > 0) {
          console.log("🔄 Loading vesting info for receiver escrows...");
          await loadVestingInfo(receiverEscrows);
        }
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
    console.log("🔍 getClaimableSenderEscrows called with escrows:", {
      totalSenderEscrows: senderEscrows.length,
      escrowBreakdown: senderEscrows.map((escrow: any) => ({
        escrowId: escrow.escrowId,
        tokenType: escrow.tokenType,
        dataSource: escrow.dataSource,
        availableBalance: escrow.availableBalance,
        totalAmount: escrow.totalAmount,
        hasRequiredFields: !!(
          escrow.availableBalance &&
          escrow.totalAmount &&
          escrow.tokenType
        ),
      })),
    });

    const claimableEscrows = senderEscrows.filter((escrow) => {
      let availableBalance = parseFloat(escrow.availableBalance || "0");
      let totalAllocated = parseFloat(escrow.totalAmount || "0");

      // Handle token decimals - contract returns raw values that need decimal conversion
      if (escrow.tokenType === "USDC" || escrow.tokenType === "USDT") {
        // USDC/USDT use 6 decimals, so raw values need to be divided by 10^6
        availableBalance = availableBalance / 1000000;
        totalAllocated = totalAllocated / 1000000;
      } else if (escrow.tokenType === "IDRX") {
        // IDRX uses 2 decimals, raw values might need to be divided by 10^2
        // Divide if the value seems to be in raw format (>= 100 typically indicates raw format)
        if (availableBalance >= 100) {
          availableBalance = availableBalance / 100;
        }
        if (totalAllocated >= 100) {
          totalAllocated = totalAllocated / 100;
        }
      }

      const isClaimable = availableBalance >= totalAllocated;

      console.log(`📊 Claimable check for escrow ${escrow.escrowId}:`, {
        tokenType: escrow.tokenType,
        rawAvailable: escrow.availableBalance,
        rawTotal: escrow.totalAmount,
        formattedAvailable: availableBalance,
        formattedTotal: totalAllocated,
        isClaimable,
        dataSource: escrow.dataSource,
      });

      return isClaimable;
    });

    console.log("✅ Final claimable escrows:", {
      totalClaimable: claimableEscrows.length,
      claimableIdrx: claimableEscrows.filter((e) => e.tokenType === "IDRX")
        .length,
      claimableUsdc: claimableEscrows.filter((e) => e.tokenType === "USDC")
        .length,
      claimableUsdt: claimableEscrows.filter((e) => e.tokenType === "USDT")
        .length,
    });

    return claimableEscrows;
  };

  // Helper function to get vesting info for an escrow
  const getVestingInfo = (escrowId: string) => {
    const vestingKey = `${escrowId}-${effectiveWalletAddress}`;
    return vestingInfoMap.get(vestingKey);
  };

  // Helper function to format vesting status
  const formatVestingStatus = (vestingData: any) => {
    if (!vestingData) return null;

    const { vestingTimeline, receiverVestingInfo, tokenType } = vestingData;

    return {
      status: vestingTimeline.status,
      progressPercentage: vestingTimeline.progressPercentage,
      vestedAmount: formatVestingAmount(
        receiverVestingInfo.vestedAmount,
        tokenType,
      ),
      availableToWithdraw: formatVestingAmount(
        receiverVestingInfo.availableToClaim,
        tokenType,
      ),
      totalVested: formatVestingAmount(
        receiverVestingInfo.totalVestedAmount,
        tokenType,
      ),
      remainingDays: vestingTimeline.remainingDays,
      endDate: vestingTimeline.endDate,
      tokenSymbol: tokenType === "IDRX_BASE" ? "IDRX" : tokenType,
    };
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
          pendingEscrows: allEscrows.filter(
            (escrow) => escrow.type === "pending",
          ).length,
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
                    {isLoadingVesting && (
                      <div className="flex items-center ml-2">
                        <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-orange-400 text-xs ml-1">
                          Loading vesting...
                        </span>
                      </div>
                    )}
                  </h4>
                  <div className="space-y-4">
                    {allEscrows
                      .filter((escrow) => escrow.type === "claimable")
                      .map((escrow, index) => {
                        const vestingInfo = getVestingInfo(escrow.escrowId);
                        const vestingStatus = formatVestingStatus(vestingInfo);

                        return (
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

                                  {/* Vesting Status Indicator */}
                                  {vestingStatus && (
                                    <div className="flex items-center space-x-2 mt-1">
                                      <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                                      <span className="text-orange-400 text-xs">
                                        {vestingStatus.status === "IN_PROGRESS"
                                          ? `Vesting (${vestingStatus.progressPercentage.toFixed(1)}%)`
                                          : vestingStatus.status === "COMPLETED"
                                            ? "Vesting Complete"
                                            : "Vesting Not Started"}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center space-x-2 mb-2">
                                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                  <span className="text-green-400 text-sm">
                                    {vestingStatus
                                      ? "Vested Available"
                                      : "Claimable"}
                                  </span>
                                </div>
                                <button
                                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all hover:scale-105"
                                  onClick={() => {
                                    // Include vesting information in the escrow data
                                    const escrowWithVesting = {
                                      ...escrow,
                                      vestingInfo: vestingInfo,
                                      vestingStatus: vestingStatus,
                                    };
                                    setSelectedEscrowForClaim(
                                      escrowWithVesting,
                                    );
                                    setIsClaimModalOpen(true);
                                  }}
                                >
                                  {vestingStatus ? "Claim Vested" : "Claim Now"}
                                </button>{" "}
                                {/* Vesting Amount Info */}
                                {vestingStatus && (
                                  <div className="text-xs text-orange-400 mt-1">
                                    {vestingStatus.availableToWithdraw}{" "}
                                    {vestingStatus.tokenSymbol} vested
                                  </div>
                                )}
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
                                    {vestingStatus
                                      ? "Vested Available:"
                                      : "Available:"}
                                  </span>
                                  <div className="text-white">
                                    {vestingStatus ? (
                                      <>
                                        {vestingStatus.availableToWithdraw}{" "}
                                        {vestingStatus.tokenSymbol}
                                        <div className="text-xs text-orange-400">
                                          (of {vestingStatus.totalVested} total
                                          vested)
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        {formatTokenAmountWithDecimals(
                                          escrow.availableAmount || "0",
                                          escrow.originCurrency || "IDRX",
                                        )}{" "}
                                        {escrow.originCurrency}
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-white/60">
                                    Created:
                                  </span>
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
                                  <div
                                    className={
                                      vestingStatus
                                        ? "text-orange-400"
                                        : "text-green-400"
                                    }
                                  >
                                    {vestingStatus
                                      ? `Vesting ${vestingStatus.progressPercentage.toFixed(1)}%`
                                      : "Ready to Claim"}
                                  </div>
                                </div>
                              </div>

                              {/* Vesting Progress Details */}
                              {vestingStatus && (
                                <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-orange-400 font-medium text-sm">
                                      🕒 Vesting Progress
                                    </span>
                                    <span className="text-orange-400 text-sm">
                                      {vestingStatus.remainingDays > 0
                                        ? `${vestingStatus.remainingDays} days remaining`
                                        : "Vesting complete"}
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
                                      <span className="text-white/60">
                                        Total Vested:
                                      </span>
                                      <div className="text-orange-400">
                                        {vestingStatus.totalVested}{" "}
                                        {vestingStatus.tokenSymbol}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-white/60">
                                        Vesting Ends:
                                      </span>
                                      <div className="text-white">
                                        {vestingStatus.endDate.toLocaleDateString()}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
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
                    (escrow) =>
                      escrow.type === "claimable" || escrow.type === "pending",
                  )}
                  isLoading={isCheckingData || isLoadingVesting}
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

      {/* Claim Modal */}
      <ClaimModal
        isOpen={isClaimModalOpen}
        onClose={() => {
          setIsClaimModalOpen(false);
          setSelectedEscrowForClaim(null);
        }}
        escrow={selectedEscrowForClaim}
      />
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
