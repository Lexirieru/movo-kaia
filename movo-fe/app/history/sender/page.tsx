"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/userContext";
import { useRouter } from "next/navigation";
import { getUserEscrowEvents, getEscrowEventStatistics } from "@/app/api/api";
import {
  ArrowLeft,
  Users,
  DollarSign,
  Calendar,
  Plus,
  Settings,
  Trash2,
  ArrowUpRight,
  Clock,
  Activity,
} from "lucide-react";
import PageHeader from "@/app/components/layout/PageHeader";
import LoadingState from "@/app/components/shared/LoadingState";
import EmptyState from "@/app/components/shared/EmptyState";
import StatsCards from "@/app/components/shared/StatsCards";
import SearchFilterBar from "@/app/components/shared/SearchFilterBar";
import MainLayout from "@/app/components/layout/MainLayout";

interface EscrowEvent {
  _id: string;
  eventType: string;
  escrowId: string;
  groupId: string;
  transactionHash: string;
  blockNumber?: string;
  initiatorId: string;
  initiatorWalletAddress: string;
  initiatorName: string;
  tokenType: string;
  eventData: any;
  metadata: any;
  status: string;
  blockTimestamp?: Date;
  createdAt: Date;
}

export default function SenderHistoryPage() {
  const { user, currentWalletAddress } = useAuth();
  const [events, setEvents] = useState<EscrowEvent[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTimeRange, setSelectedTimeRange] = useState<
    "24h" | "7d" | "30d" | "90d" | "all"
  >("30d");
  const [eventTypeFilter, setEventTypeFilter] = useState<
    | "all"
    | "ESCROW_CREATED"
    | "TOPUP_FUNDS"
    | "ADD_RECIPIENTS"
    | "REMOVE_RECIPIENTS"
    | "UPDATE_RECIPIENTS_AMOUNT"
  >("all");
  const router = useRouter();

  useEffect(() => {
    const fetchEscrowEvents = async () => {
      if (!user?._id || !currentWalletAddress) return;

      try {
        setLoading(true);

        // Fetch user escrow events
        const eventsResponse = await getUserEscrowEvents(
          user._id,
          currentWalletAddress,
        );
        if (eventsResponse?.data?.allEvents) {
          setEvents(eventsResponse.data.allEvents);
        }

        // Fetch statistics
        const statsResponse = await getEscrowEventStatistics(
          user._id,
          currentWalletAddress,
          selectedTimeRange,
        );
        if (statsResponse?.data) {
          setStatistics(statsResponse.data);
        }
      } catch (err) {
        console.error("Error fetching escrow events", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEscrowEvents();
  }, [user?._id, currentWalletAddress, selectedTimeRange]);

  // Event Type Colors and Labels
  const EventTypeColors = {
    ESCROW_CREATED: "bg-green-100 text-green-800 border-green-200",
    TOPUP_FUNDS: "bg-blue-100 text-blue-800 border-blue-200",
    ADD_RECIPIENTS: "bg-purple-100 text-purple-800 border-purple-200",
    REMOVE_RECIPIENTS: "bg-red-100 text-red-800 border-red-200",
    UPDATE_RECIPIENTS_AMOUNT: "bg-yellow-100 text-yellow-800 border-yellow-200",
  };

  const EventTypeLabels = {
    ESCROW_CREATED: "Escrow Created",
    TOPUP_FUNDS: "Funds Added",
    ADD_RECIPIENTS: "Recipients Added",
    REMOVE_RECIPIENTS: "Recipients Removed",
    UPDATE_RECIPIENTS_AMOUNT: "Amount Updated",
  };

  // Filter events
  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.escrowId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      EventTypeLabels[event.eventType as keyof typeof EventTypeLabels]
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      event.transactionHash.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      eventTypeFilter === "all" || event.eventType === eventTypeFilter;

    return matchesSearch && matchesType;
  });

  // Format event data
  const formatEventData = (eventType: string, eventData: any) => {
    switch (eventType) {
      case "ESCROW_CREATED":
        return {
          description: `Created escrow with ${eventData.recipients?.length || 0} recipients`,
          amount: eventData.totalAmount,
        };
      case "TOPUP_FUNDS":
        return {
          description: "Added funds to escrow",
          amount: eventData.topupAmount,
        };
      case "ADD_RECIPIENTS":
        return {
          description: `Added ${eventData.newRecipients?.length || 0} new recipients`,
          amount: null,
        };
      case "REMOVE_RECIPIENTS":
        return {
          description: `Removed ${eventData.removedRecipients?.length || 0} recipients`,
          amount: null,
        };
      case "UPDATE_RECIPIENTS_AMOUNT":
        return {
          description: `Updated ${eventData.updatedRecipients?.length || 0} recipient amounts`,
          amount: null,
        };
      default:
        return {
          description: "Escrow activity",
          amount: null,
        };
    }
  };

  if (loading) {
    return <LoadingState message="Loading escrow events..." fullScreen />;
  }

  // Stats data
  const statsData = statistics
    ? [
        {
          icon: <Plus className="w-5 h-5 text-green-400" />,
          value: statistics.summary.escrowsCreated,
          label: "Escrows Created",
          iconBgColor: "bg-green-500/20",
        },
        {
          icon: <ArrowUpRight className="w-5 h-5 text-blue-400" />,
          value: statistics.summary.topups,
          label: "Topups",
          iconBgColor: "bg-blue-500/20",
        },
        {
          icon: <Settings className="w-5 h-5 text-purple-400" />,
          value: statistics.summary.recipientChanges,
          label: "Recipient Changes",
          iconBgColor: "bg-purple-500/20",
        },
        {
          icon: <Activity className="w-5 h-5 text-orange-400" />,
          value: statistics.totalEvents,
          label: "Total Events",
          iconBgColor: "bg-orange-500/20",
        },
      ]
    : [];

  // Filter options
  const timeRangeOptions = [
    { value: "24h", label: "Last 24 Hours" },
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" },
    { value: "90d", label: "Last 90 Days" },
    { value: "all", label: "All Time" },
  ];

  const eventTypeOptions = [
    { value: "all", label: "All Events" },
    { value: "ESCROW_CREATED", label: "Escrow Created" },
    { value: "TOPUP_FUNDS", label: "Funds Added" },
    { value: "ADD_RECIPIENTS", label: "Recipients Added" },
    { value: "REMOVE_RECIPIENTS", label: "Recipients Removed" },
    { value: "UPDATE_RECIPIENTS_AMOUNT", label: "Amount Updated" },
  ];

  return (
    <MainLayout>
      {/* Header */}
      <PageHeader
        title="Escrow History"
        subtitle="Your escrow events and activities"
        backPath="/dashboard"
        walletAddress={currentWalletAddress}
      />

      {/* Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Action Header */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">
            Your Escrow Activities
          </h2>
          <p className="text-gray-400 text-sm">
            Track all your escrow operations and events
          </p>
        </div>

        {/* Stats Cards */}
        {statistics && <StatsCards stats={statsData} columns={4} />}

        {/* Search and Filters */}
        <SearchFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search by escrow ID, event type, or transaction hash..."
          statusFilter={{
            value: eventTypeFilter,
            options: eventTypeOptions,
            onChange: (value: string) => setEventTypeFilter(value as any),
          }}
          dateFilter={{
            value: selectedTimeRange,
            options: timeRangeOptions,
            onChange: (value: string) => setSelectedTimeRange(value as any),
          }}
        />

        {/* Events List */}
        {filteredEvents.length === 0 ? (
          <EmptyState
            icon={<Activity className="w-8 h-8 text-gray-500" />}
            title="No Events Found"
            description={
              searchTerm
                ? `No results for "${searchTerm}"`
                : "No escrow events available"
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event) => {
              const eventInfo = formatEventData(
                event.eventType,
                event.eventData,
              );

              return (
                <div
                  key={event._id}
                  className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 hover:bg-gray-800/70 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${EventTypeColors[event.eventType as keyof typeof EventTypeColors] || "bg-gray-100 text-gray-800 border-gray-200"}`}
                        >
                          {EventTypeLabels[
                            event.eventType as keyof typeof EventTypeLabels
                          ] || event.eventType}
                        </span>
                        <span className="text-sm text-gray-400">
                          {event.tokenType}
                        </span>
                      </div>

                      <div className="mb-3">
                        <p className="text-white font-medium">
                          {eventInfo.description}
                        </p>
                        <p className="text-sm text-gray-400">
                          Escrow: {event.escrowId}
                        </p>
                        {eventInfo.amount && (
                          <p className="text-sm text-cyan-400">
                            Amount: {eventInfo.amount} {event.tokenType}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-gray-400">
                        {new Date(
                          event.blockTimestamp || event.createdAt,
                        ).toLocaleString()}
                      </p>
                      <a
                        href={`https://etherscan.io/tx/${event.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        View Transaction
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
