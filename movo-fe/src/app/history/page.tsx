"use client";

import { useEffect, Suspense, useState } from "react";
import { useWallet } from "@/lib/walletContext";
import { useAuth } from "@/lib/userContext";
import MainLayout from "@/components/layout/MainLayout";
import WalletWarning from "@/components/dashboard/WalletWarning";
import { fetchSenderEvents, fetchReceiverEvents } from "../api/api";
import {
  Activity,
  Plus,
  ArrowUpRight,
  Settings,
  Users,
  DollarSign,
  Clock,
  ExternalLink,
  Search,
  Filter,
  TrendingUp,
  Wallet,
  Send,
  Download,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import LoadingState from "@/components/shared/LoadingState";
import EmptyState from "@/components/shared/EmptyState";
import StatsCards from "@/components/shared/StatsCards";
import SearchFilterBar from "@/components/shared/SearchFilterBar";

interface SenderActivity {
  escrowId: string;
  eventType: "ESCROW_CREATED" | "TOPUP" | "MODIFY_RECIPIENTS";
  amount?: string;
  tokenType: string;
  timestamp: Date;
  transactionHash?: string;
  description: string;
}

interface ReceiverActivity {
  escrowId: string;
  eventType: "CLAIM_CRYPTO";
  amount: string;
  tokenType: string;
  timestamp: Date;
  transactionHash?: string;
  description: string;
  fromSender?: string;
}

function HistoryContent() {
  const { isConnected, address, isConnecting, setDisableAutoLogin } =
    useWallet();
  const { user, currentWalletAddress } = useAuth();
  const effectiveWalletAddress = currentWalletAddress || address || "";

  // Disable auto login untuk history page
  useEffect(() => {
    setDisableAutoLogin(true);
    return () => setDisableAutoLogin(false);
  }, [setDisableAutoLogin]);

  const [senderActivities, setSenderActivities] = useState<SenderActivity[]>(
    [],
  );
  const [receiverActivities, setReceiverActivities] = useState<
    ReceiverActivity[]
  >([]);
  const [loadingData, setLoadingData] = useState(false);
  const [userHasData, setUserHasData] = useState<
    "sender" | "receiver" | "both" | "none"
  >("none");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTimeRange, setSelectedTimeRange] = useState<
    "24h" | "7d" | "30d" | "90d" | "all"
  >("30d");
  const [eventTypeFilter, setEventTypeFilter] = useState<
    "all" | "ESCROW_CREATED" | "TOPUP" | "MODIFY_RECIPIENTS" | "CLAIM_CRYPTO"
  >("all");

  // Helper function to determine token type from address or contract
  const determineTokenType = (
    tokenAddress?: string,
    contractId?: string,
  ): "USDC" | "USDT" | "IDRX" => {
    const lowerTokenAddress = tokenAddress?.toLowerCase() || "";
    const lowerContractId = contractId?.toLowerCase() || "";

    if (
      lowerContractId.includes("idrx") ||
      lowerContractId.includes("77fea84") ||
      lowerTokenAddress.includes("idrx")
    ) {
      return "IDRX";
    }

    if (
      lowerContractId.includes("usdt") ||
      lowerContractId.includes("80327544") ||
      lowerTokenAddress.includes("usdt")
    ) {
      return "USDT";
    }

    // Default to USDC
    return "USDC";
  };

  // Helper function to format token amount with proper decimals
  const formatTokenAmountWithDecimals = (amount: string, tokenType: string) => {
    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber)) return "0.00";

    // USDC and USDT use 6 decimals, IDRX uses 2 decimals
    const decimals = tokenType === "IDRX" ? 2 : 6;
    const divisor = Math.pow(10, decimals);
    const formattedAmount = amountNumber / divisor;

    return formattedAmount.toFixed(2);
  };

  // Fetch sender activities using the new dedicated function
  const fetchSenderActivities = async () => {
    if (!effectiveWalletAddress) {
      return;
    }

    try {
      setLoadingData(true);
      console.log("🔍 Fetching sender activities for:", effectiveWalletAddress);

      // Get only sender events - no more fetchEscrowsFromIndexer
      const senderEvents = await fetchSenderEvents(effectiveWalletAddress);
      console.log("📊 Raw sender events received:", senderEvents);

      const activities: SenderActivity[] = [];

      // Process sender events only (TOPUP_FUNDS, REMOVE_RECIPIENTS, UPDATE_RECIPIENTS_AMOUNT)
      senderEvents.forEach((event: any) => {
        // Validate event data before processing
        if (!event.escrowId || !event.timestamp_ || !event.tokenType) {
          console.warn("⚠️ Skipping invalid sender event:", event);
          return;
        }

        const tokenType = event.tokenType;
        console.log(tokenType);
        const timestamp = new Date(parseInt(event.timestamp_) * 1000);

        switch (event.eventType) {
          case "ESCROW_CREATED":
            if (event.totalAmount && event.receivers) {
              // Parse receivers count from the receivers string
              const receiversCount = event.receivers.split(",").length;
              activities.push({
                escrowId: event.escrowId,
                eventType: "ESCROW_CREATED",
                amount: event.totalAmount,
                tokenType,
                timestamp,
                transactionHash: event.transactionHash_,
                description: `Created escrow with ${formatTokenAmountWithDecimals(event.totalAmount, tokenType)} ${tokenType} for ${receiversCount} recipient${receiversCount > 1 ? "s" : ""}`,
              });
            }
            break;

          case "TOPUP_FUNDS":
            if (event.amount) {
              activities.push({
                escrowId: event.escrowId,
                eventType: "TOPUP",
                amount: event.amount,
                tokenType,
                timestamp,
                transactionHash: event.transactionHash_,
                description: `Added ${formatTokenAmountWithDecimals(event.amount, tokenType)} ${tokenType} to escrow`,
              });
            }
            break;

          case "REMOVE_RECIPIENTS":
            if (event.receiver) {
              activities.push({
                escrowId: event.escrowId,
                eventType: "MODIFY_RECIPIENTS",
                amount: event.refundAmount || "0",
                tokenType,
                timestamp,
                transactionHash: event.transactionHash_,
                description: `Removed recipient: ${event.receiver?.slice(0, 6)}...${event.receiver?.slice(-4)}`,
              });
            }
            break;

          case "UPDATE_RECIPIENTS_AMOUNT":
            if (event.receiver && event.newAmount) {
              activities.push({
                escrowId: event.escrowId,
                eventType: "MODIFY_RECIPIENTS",
                amount: event.newAmount,
                tokenType,
                timestamp,
                transactionHash: event.transactionHash_,
                description: `Updated recipient amount: ${event.receiver?.slice(0, 6)}...${event.receiver?.slice(-4)}`,
              });
            }
            break;

          default:
            console.warn("⚠️ Unknown sender event type:", event.eventType);
            break;
        }
      });

      // Sort activities by timestamp (newest first)
      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      console.log("📊 Sender activities combined:", activities);
      setSenderActivities(activities);

      return activities;
    } catch (error) {
      console.error("❌ Error fetching sender activities:", error);
      setSenderActivities([]);
      return [];
    }
  };

  // Fetch receiver activities using the new dedicated function
  const fetchReceiverActivities = async () => {
    if (!effectiveWalletAddress) {
      return;
    }

    try {
      setLoadingData(true);

      // Use the new dedicated function for receiver events
      const receiverEvents = await fetchReceiverEvents(effectiveWalletAddress);

      const activities: ReceiverActivity[] = [];

      // Process withdrawal events (WITHDRAW_FUNDS)
      receiverEvents.forEach((event: any) => {
        const tokenType = event.tokenType;
        const timestamp = new Date(parseInt(event.timestamp_) * 1000);

        if (event.eventType === "WITHDRAW_FUNDS") {
          const withdrawType = event.withdrawType || "CRYPTO";
          const description =
            withdrawType === "FIAT"
              ? `Claimed ${formatTokenAmountWithDecimals(event.amount, tokenType)} ${tokenType} to fiat`
              : `Claimed ${formatTokenAmountWithDecimals(event.amount, tokenType)} ${tokenType} to crypto wallet`;

          activities.push({
            escrowId: event.escrowId,
            eventType: "CLAIM_CRYPTO",
            amount: event.amount,
            tokenType,
            timestamp,
            transactionHash: event.transactionHash_,
            description,
            fromSender: event.depositWallet, // This might contain sender or deposit wallet info
          });
        }
      });

      // Sort activities by timestamp (newest first)
      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      console.log(
        "📊 Receiver activities from dedicated function:",
        activities,
      );
      setReceiverActivities(activities);

      return activities;
    } catch (error) {
      console.error("❌ Error fetching receiver activities:", error);
      setReceiverActivities([]);
      return [];
    }
  };

  // Determine user data and role automatically
  useEffect(() => {
    const determineUserDataAndRole = async () => {
      if (!effectiveWalletAddress || !isConnected) {
        setUserHasData("none");
        return;
      }

      setLoadingData(true);

      try {
        // Fetch both sender and receiver data in parallel
        const [senderActivitiesData, receiverActivitiesData] =
          await Promise.all([
            fetchSenderActivities(),
            fetchReceiverActivities(),
          ]);

        // Determine what type of data user has
        const hasSenderData =
          senderActivitiesData && senderActivitiesData.length > 0;
        const hasReceiverData =
          receiverActivitiesData && receiverActivitiesData.length > 0;

        if (hasSenderData && hasReceiverData) {
          setUserHasData("both");
        } else if (hasSenderData) {
          setUserHasData("sender");
        } else if (hasReceiverData) {
          setUserHasData("receiver");
        } else {
          setUserHasData("none");
        }
      } catch (error) {
        console.error("❌ Error determining user data:", error);
        setUserHasData("none");
      } finally {
        setLoadingData(false);
      }
    };

    determineUserDataAndRole();
  }, [effectiveWalletAddress, isConnected]);

  // Get all activities based on user role
  const getAllActivities = (): (SenderActivity | ReceiverActivity)[] => {
    const allActivities: (SenderActivity | ReceiverActivity)[] = [];

    if (userHasData === "sender" || userHasData === "both") {
      allActivities.push(...senderActivities);
    }

    if (userHasData === "receiver" || userHasData === "both") {
      allActivities.push(...receiverActivities);
    }

    // Sort by timestamp (newest first)
    return allActivities.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
  };

  // Filter activities based on search and filters
  const getFilteredActivities = () => {
    const allActivities = getAllActivities();

    return allActivities.filter((activity) => {
      const matchesSearch =
        activity.escrowId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.tokenType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.eventType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType =
        eventTypeFilter === "all" || activity.eventType === eventTypeFilter;

      // Apply time range filter
      const now = new Date();
      const activityTime = activity.timestamp;
      let matchesTimeRange = true;

      switch (selectedTimeRange) {
        case "24h":
          matchesTimeRange =
            now.getTime() - activityTime.getTime() <= 24 * 60 * 60 * 1000;
          break;
        case "7d":
          matchesTimeRange =
            now.getTime() - activityTime.getTime() <= 7 * 24 * 60 * 60 * 1000;
          break;
        case "30d":
          matchesTimeRange =
            now.getTime() - activityTime.getTime() <= 30 * 24 * 60 * 60 * 1000;
          break;
        case "90d":
          matchesTimeRange =
            now.getTime() - activityTime.getTime() <= 90 * 24 * 60 * 60 * 1000;
          break;
        case "all":
        default:
          matchesTimeRange = true;
          break;
      }

      return matchesSearch && matchesType && matchesTimeRange;
    });
  };

  const filteredActivities = getFilteredActivities();

  // Calculate statistics
  const getStats = () => {
    const allActivities = getAllActivities();
    const senderActivitiesCount = senderActivities.length;
    const receiverActivitiesCount = receiverActivities.length;

    // Calculate total value from sender activities (topups and modifications)
    const totalValue = senderActivities.reduce((sum, activity) => {
      const amount = parseFloat(activity.amount || "0");
      return sum + amount;
    }, 0);

    const uniqueTokens = new Set(allActivities.map((a) => a.tokenType)).size;

    if (userHasData === "sender") {
      return [
        {
          icon: <Send className="w-5 h-5 text-green-400" />,
          value: senderActivitiesCount,
          label: "Escrow Activities",
          iconBgColor: "bg-green-500/20",
        },
        {
          icon: <DollarSign className="w-5 h-5 text-blue-400" />,
          value: totalValue.toFixed(2),
          label: "Total Value",
          iconBgColor: "bg-blue-500/20",
        },
        {
          icon: <Users className="w-5 h-5 text-purple-400" />,
          value: uniqueTokens,
          label: "Token Types",
          iconBgColor: "bg-purple-500/20",
        },
        {
          icon: <Activity className="w-5 h-5 text-orange-400" />,
          value: allActivities.length,
          label: "Total Activities",
          iconBgColor: "bg-orange-500/20",
        },
      ];
    } else if (userHasData === "receiver") {
      const totalClaimed = receiverActivities.reduce((sum, activity) => {
        return sum + parseFloat(activity.amount || "0");
      }, 0);

      return [
        {
          icon: <Download className="w-5 h-5 text-green-400" />,
          value: receiverActivitiesCount,
          label: "Claims Made",
          iconBgColor: "bg-green-500/20",
        },
        {
          icon: <DollarSign className="w-5 h-5 text-blue-400" />,
          value: totalClaimed.toFixed(2),
          label: "Total Claimed",
          iconBgColor: "bg-blue-500/20",
        },
        {
          icon: <Users className="w-5 h-5 text-purple-400" />,
          value: uniqueTokens,
          label: "Token Types",
          iconBgColor: "bg-purple-500/20",
        },
        {
          icon: <Activity className="w-5 h-5 text-orange-400" />,
          value: allActivities.length,
          label: "Total Activities",
          iconBgColor: "bg-orange-500/20",
        },
      ];
    } else {
      // Both sender and receiver
      return [
        {
          icon: <Send className="w-5 h-5 text-green-400" />,
          value: senderActivitiesCount,
          label: "Sent Activities",
          iconBgColor: "bg-green-500/20",
        },
        {
          icon: <Download className="w-5 h-5 text-blue-400" />,
          value: receiverActivitiesCount,
          label: "Received Activities",
          iconBgColor: "bg-blue-500/20",
        },
        {
          icon: <Users className="w-5 h-5 text-purple-400" />,
          value: uniqueTokens,
          label: "Token Types",
          iconBgColor: "bg-purple-500/20",
        },
        {
          icon: <Activity className="w-5 h-5 text-orange-400" />,
          value: allActivities.length,
          label: "Total Activities",
          iconBgColor: "bg-orange-500/20",
        },
      ];
    }
  };

  // Format activity data for display
  const formatActivityData = (activity: SenderActivity | ReceiverActivity) => {
    const tokenType = activity.tokenType;

    switch (activity.eventType) {
      case "ESCROW_CREATED":
        const createdActivity = activity as SenderActivity;
        return {
          description: createdActivity.description,
          amount: parseFloat(createdActivity.amount || "0"),
          tokenType,
          color: "bg-green-100 text-green-800 border-green-200",
          label: "Escrow Created",
          icon: <Plus className="w-4 h-4" />,
        };

      case "TOPUP":
        const topupActivity = activity as SenderActivity;
        return {
          description: topupActivity.description,
          amount: parseFloat(topupActivity.amount || "0"),
          tokenType,
          color: "bg-blue-100 text-blue-800 border-blue-200",
          label: "Funds Added",
          icon: <ArrowUpRight className="w-4 h-4" />,
        };

      case "MODIFY_RECIPIENTS":
        const modifyActivity = activity as SenderActivity;
        return {
          description: modifyActivity.description,
          amount: parseFloat(modifyActivity.amount || "0"),
          tokenType,
          color: "bg-purple-100 text-purple-800 border-purple-200",
          label: "Recipients Modified",
          icon: <Users className="w-4 h-4" />,
        };

      case "CLAIM_CRYPTO":
        const claimActivity = activity as ReceiverActivity;
        return {
          description: claimActivity.description,
          amount: parseFloat(claimActivity.amount || "0"),
          tokenType,
          fromSender: claimActivity.fromSender,
          color: "bg-orange-100 text-orange-800 border-orange-200",
          label: "Crypto Claimed",
          icon: <Download className="w-4 h-4" />,
        };

      default:
        return {
          description: "Activity",
          amount: 0,
          tokenType,
          color: "bg-gray-100 text-gray-800 border-gray-200",
          label: "Unknown Activity",
          icon: <Activity className="w-4 h-4" />,
        };
    }
  };

  // Format date
  const formatDate = (timestamp: Date) => {
    return timestamp.toLocaleString();
  };

  // Get page title based on user role
  const getPageTitle = () => {
    switch (userHasData) {
      case "sender":
        return "Sender Activity History";
      case "receiver":
        return "Receiver Claim History";
      case "both":
        return "Complete Activity History";
      default:
        return "Transaction History";
    }
  };

  // Get page subtitle based on user role
  const getPageSubtitle = () => {
    switch (userHasData) {
      case "sender":
        return "Your escrow creation and management activities";
      case "receiver":
        return "Your crypto claim activities from escrows";
      case "both":
        return "Your complete escrow and claim activities";
      default:
        return "Your escrow-related activities";
    }
  };

  if (isConnecting) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Connecting wallet...</p>
        </div>
      </section>
    );
  }

  return (
    <MainLayout>
      <div className="px-4 py-6 min-h-[calc(100vh-9rem)]">
        <div className="container mx-auto max-w-6xl">
          {!isConnected || !address ? (
            <WalletWarning />
          ) : !effectiveWalletAddress ? (
            <div className="text-center py-12">
              <p className="text-gray-400">Connecting wallet...</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <PageHeader
                title={getPageTitle()}
                subtitle={getPageSubtitle()}
                backPath="/dashboard"
                walletAddress={effectiveWalletAddress}
              />

              {/* Content */}
              <div className="space-y-6">
                {userHasData !== "none" && (
                  <>
                    {/* Stats Cards */}
                    <StatsCards stats={getStats()} columns={4} />

                    {/* Search and Filters */}
                    <SearchFilterBar
                      searchTerm={searchTerm}
                      onSearchChange={setSearchTerm}
                      searchPlaceholder="Search by escrow ID, token type, or description..."
                      statusFilter={{
                        value: eventTypeFilter,
                        options: [
                          { value: "all", label: "All Activities" },
                          ...(userHasData === "sender" || userHasData === "both"
                            ? [
                                {
                                  value: "ESCROW_CREATED",
                                  label: "Escrow Created",
                                },
                                { value: "TOPUP", label: "Funds Added" },
                                {
                                  value: "MODIFY_RECIPIENTS",
                                  label: "Recipients Modified",
                                },
                              ]
                            : []),
                          ...(userHasData === "receiver" ||
                          userHasData === "both"
                            ? [
                                {
                                  value: "CLAIM_CRYPTO",
                                  label: "Crypto Claims",
                                },
                              ]
                            : []),
                        ],
                        onChange: (value: string) =>
                          setEventTypeFilter(value as any),
                      }}
                      dateFilter={{
                        value: selectedTimeRange,
                        options: [
                          { value: "24h", label: "Last 24 Hours" },
                          { value: "7d", label: "Last 7 Days" },
                          { value: "30d", label: "Last 30 Days" },
                          { value: "90d", label: "Last 90 Days" },
                          { value: "all", label: "All Time" },
                        ],
                        onChange: (value: string) =>
                          setSelectedTimeRange(value as any),
                      }}
                    />
                  </>
                )}

                {/* Activities List */}
                {loadingData ? (
                  <LoadingState message="Loading your activity history..." />
                ) : userHasData === "none" ? (
                  <EmptyState
                    icon={<Activity className="w-8 h-8 text-gray-500" />}
                    title="No Activity Found"
                    description="You haven't created any escrows or claimed any payments yet"
                  />
                ) : filteredActivities.length === 0 ? (
                  <EmptyState
                    icon={<Search className="w-8 h-8 text-gray-500" />}
                    title="No Results Found"
                    description={
                      searchTerm
                        ? `No activities match "${searchTerm}"`
                        : "No activities match your current filters"
                    }
                  />
                ) : (
                  <div className="space-y-4">
                    {filteredActivities.map((activity, index) => {
                      const activityInfo = formatActivityData(activity);

                      return (
                        <div
                          key={`${activity.escrowId}-${activity.eventType}-${index}`}
                          className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 hover:bg-gray-800/70 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 w-1/2">
                              <div className="flex items-center space-x-3 mb-2">
                                <div
                                  className={`p-1.5 rounded-full ${activityInfo.color.replace("text-", "bg-").replace("-800", "-500/20")}`}
                                >
                                  {activityInfo.icon}
                                </div>
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${activityInfo.color}`}
                                >
                                  {activityInfo.label}
                                </span>
                                <span className="text-sm text-gray-400">
                                  {activityInfo.tokenType}
                                </span>
                              </div>

                              <div className="mb-3">
                                <p className="text-white font-medium">
                                  {activityInfo.description}
                                </p>
                                <p className="text-sm text-gray-400">
                                  Escrow: {activity.escrowId.slice(0, 8)}...
                                  {activity.escrowId.slice(-4)}
                                </p>
                                {activityInfo.amount > 0 && (
                                  <p className="text-sm text-cyan-400">
                                    Amount:{" "}
                                    {formatTokenAmountWithDecimals(
                                      activityInfo.amount.toString(),
                                      activityInfo.tokenType,
                                    )}{" "}
                                    {activityInfo.tokenType}
                                  </p>
                                )}
                                {activityInfo.fromSender && (
                                  <p className="text-sm text-blue-400">
                                    From: {activityInfo.fromSender.slice(0, 6)}
                                    ...{activityInfo.fromSender.slice(-4)}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-sm text-gray-400">
                                <div className="text-xs">
                                  {activity.timestamp.toLocaleDateString()}
                                </div>
                                <div className="text-xs">
                                  {activity.timestamp.toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              </div>
                              {activity.transactionHash && (
                                <a
                                  href={`https://etherscan.io/tx/${activity.transactionHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                                >
                                  <span>View Transaction</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading history...</p>
          </div>
        </div>
      }
    >
      <HistoryContent />
    </Suspense>
  );
}
