"use client";

import { useEffect, Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useWallet } from "@/lib/walletContext";
import MainLayout from "@/components/layout/MainLayout";
import WalletWarning from "@/components/dashboard/WalletWarning";
// Removed backend API imports - using direct Goldsky integration
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
  Wallet
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import LoadingState from "@/components/shared/LoadingState";
import EmptyState from "@/components/shared/EmptyState";
import StatsCards from "@/components/shared/StatsCards";
import SearchFilterBar from "@/components/shared/SearchFilterBar";

interface EscrowEvent {
  escrowId: string;
  sender: string;
  receivers?: string[];
  amounts?: string[];
  totalAmount?: string;
  tokenAddress: string;
  block_number: string;
  timestamp_: string;
  transactionHash_: string;
  contractId_: string;
  tokenType?: string;
  eventType: string;
  // For different event types
  amount?: string;
  newCycleBalance?: string;
  receiver?: string;
  refundAmount?: string;
  oldAmount?: string;
  newAmount?: string;
  depositWallet?: string;
}

interface WithdrawEvent {
  escrowId: string;
  recipient: string;
  amount: string;
  timestamp: Date;
  transactionHash: string;
  blockNumber: string;
  depositWallet?: string;
  tokenType?: string;
}

function HistoryContent() {
  const { isConnected, address, isConnecting, setDisableAutoLogin } = useWallet();
  const searchParams = useSearchParams();
  const router = useRouter();
  const effectiveWalletAddress = address || "";
  
  // Disable auto login untuk history page
  useEffect(() => {
    setDisableAutoLogin(true);
    return () => setDisableAutoLogin(false);
  }, [setDisableAutoLogin]);
  
  // Debug wallet addresses
  console.log("🔍 Wallet addresses debug:", {
    address,
    effectiveWalletAddress,
    isConnected,
    isConnecting
  });

  const [activeTab, setActiveTab] = useState<"sender" | "receiver">("sender");
  const [senderEvents, setSenderEvents] = useState<EscrowEvent[]>([]);
  const [receiverEvents, setReceiverEvents] = useState<EscrowEvent[]>([]);
  const [withdrawEvents, setWithdrawEvents] = useState<WithdrawEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTimeRange, setSelectedTimeRange] = useState<"24h" | "7d" | "30d" | "90d" | "all">("30d");
  const [eventTypeFilter, setEventTypeFilter] = useState<"all" | "ESCROW_CREATED" | "TOPUP_FUNDS" | "ADD_RECIPIENTS" | "REMOVE_RECIPIENTS" | "UPDATE_RECIPIENTS_AMOUNT" | "WITHDRAWAL">("all");

  // Get view parameter from URL
  const viewParam = searchParams.get("view");

  // Helper function to determine token type from contract ID
  const determineTokenTypeFromContract = (contractId: string): "USDC" | "USDT" | "IDRX" => {
    const lowerContractId = contractId?.toLowerCase() || "";
    
    if (lowerContractId.includes("idrx") || lowerContractId.includes("77fea84")) {
      return "IDRX";
    }
    
    if (lowerContractId.includes("usdt") || lowerContractId.includes("80327544")) {
      return "USDT";
    }
    
    // Default to USDC
    return "USDC";
  };

  // Fetch sender events directly from Goldsky
  const fetchSenderEvents = async () => {
    if (!effectiveWalletAddress) {
      return;
    }
    
    try {
      setLoadingEvents(true);
      console.log("🔍 Fetching sender events for:", effectiveWalletAddress);
      
      // Direct Goldsky query for sender events
      const query = `
        query GetAllEvents {
          escrowCreateds(
            where: { sender: "${effectiveWalletAddress.toLowerCase()}" }
            orderBy: timestamp_
            orderDirection: desc
            first: 100
          ) {
            escrowId
            sender
            receivers
            amounts
            totalAmount
            tokenAddress
            block_number
            timestamp_
            transactionHash_
            contractId_
          }
          fundsTopUps(
            where: { sender: "${effectiveWalletAddress.toLowerCase()}" }
            orderBy: timestamp_
            orderDirection: desc
            first: 100
          ) {
            escrowId
            sender
            amount
            newCycleBalance
            tokenAddress
            block_number
            timestamp_
            transactionHash_
            contractId_
          }
          receiverAddeds(
            where: { sender: "${effectiveWalletAddress.toLowerCase()}" }
            orderBy: timestamp_
            orderDirection: desc
            first: 100
          ) {
            escrowId
            sender
            receiver
            amount
            tokenAddress
            block_number
            timestamp_
            transactionHash_
            contractId_
          }
          receiverRemoveds(
            where: { sender: "${effectiveWalletAddress.toLowerCase()}" }
            orderBy: timestamp_
            orderDirection: desc
            first: 100
          ) {
            escrowId
            sender
            receiver
            refundAmount
            tokenAddress
            block_number
            timestamp_
            transactionHash_
            contractId_
          }
          receiverAmountUpdateds(
            where: { sender: "${effectiveWalletAddress.toLowerCase()}" }
            orderBy: timestamp_
            orderDirection: desc
            first: 100
          ) {
            escrowId
            sender
            receiver
            oldAmount
            newAmount
            tokenAddress
            block_number
            timestamp_
            transactionHash_
            contractId_
          }
        }
      `;

      const response = await fetch(process.env.NEXT_PUBLIC_GOLDSKY_ESCROW_API_URL || '', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.errors) {
        console.error("❌ GraphQL errors:", result.errors);
        setSenderEvents([]);
        return;
      }

      const data = result.data;
      const allEvents: EscrowEvent[] = [];

      // Process escrow created events
      if (data.escrowCreateds) {
        data.escrowCreateds.forEach((event: any) => {
          allEvents.push({
            ...event,
            eventType: "ESCROW_CREATED",
            tokenType: determineTokenTypeFromContract(event.contractId_),
          });
        });
      }

      // Process topup events
      if (data.fundsTopUps) {
        data.fundsTopUps.forEach((event: any) => {
          allEvents.push({
            ...event,
            eventType: "TOPUP_FUNDS",
            tokenType: determineTokenTypeFromContract(event.contractId_),
          });
        });
      }

      // Process receiver added events
      if (data.receiverAddeds) {
        data.receiverAddeds.forEach((event: any) => {
          allEvents.push({
            ...event,
            eventType: "ADD_RECIPIENTS",
            tokenType: determineTokenTypeFromContract(event.contractId_),
          });
        });
      }

      // Process receiver removed events
      if (data.receiverRemoveds) {
        data.receiverRemoveds.forEach((event: any) => {
          allEvents.push({
            ...event,
            eventType: "REMOVE_RECIPIENTS",
            tokenType: determineTokenTypeFromContract(event.contractId_),
          });
        });
      }

      // Process receiver amount updated events
      if (data.receiverAmountUpdateds) {
        data.receiverAmountUpdateds.forEach((event: any) => {
          allEvents.push({
            ...event,
            eventType: "UPDATE_RECIPIENTS_AMOUNT",
            tokenType: determineTokenTypeFromContract(event.contractId_),
          });
        });
      }

      // Sort all events by timestamp
      allEvents.sort((a, b) => parseInt(b.timestamp_) - parseInt(a.timestamp_));
      
      console.log("📊 Sender events data:", allEvents);
      setSenderEvents(allEvents);
    } catch (error) {
      console.error("❌ Error fetching sender events:", error);
      setSenderEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  // Fetch receiver events directly from Goldsky
  const fetchReceiverEvents = async () => {
    if (!effectiveWalletAddress) {
      return;
    }
    
    try {
      setLoadingEvents(true);
      console.log("🔍 Fetching receiver events for:", effectiveWalletAddress);
      
      // Direct Goldsky query for receiver events
      const query = `
        query GetAllReceiverEvents {
          escrowCreateds(
            orderBy: timestamp_
            orderDirection: desc
            first: 1000
          ) {
            escrowId
            sender
            receivers
            amounts
            totalAmount
            tokenAddress
            block_number
            timestamp_
            transactionHash_
            contractId_
          }
          tokenWithdrawns(
            where: { recipient: "${effectiveWalletAddress.toLowerCase()}" }
            orderBy: timestamp_
            orderDirection: desc
            first: 100
          ) {
            escrowId
            recipient
            amount
            depositWallet
            tokenAddress
            block_number
            timestamp_
            transactionHash_
            contractId_
          }
          tokenWithdrawnToFiats(
            where: { recipient: "${effectiveWalletAddress.toLowerCase()}" }
            orderBy: timestamp_
            orderDirection: desc
            first: 100
          ) {
            escrowId
            recipient
            amount
            depositWallet
            tokenAddress
            block_number
            timestamp_
            transactionHash_
            contractId_
          }
        }
      `;

      const response = await fetch(process.env.NEXT_PUBLIC_GOLDSKY_ESCROW_API_URL || '', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.errors) {
        console.error("❌ GraphQL errors:", result.errors);
        setReceiverEvents([]);
        setWithdrawEvents([]);
        return;
      }

      const data = result.data;
      const allEvents: EscrowEvent[] = [];
      const withdrawEvents: WithdrawEvent[] = [];
      const receiverAddressLower = effectiveWalletAddress.toLowerCase();

      // Process escrow created events (where user is a receiver)
      if (data.escrowCreateds) {
        data.escrowCreateds.forEach((event: any) => {
          // Check if the receiver address is in the receivers list
          if (event.receivers) {
            const receivers = event.receivers.split(',').map((addr: string) => addr.trim().toLowerCase());
            if (receivers.includes(receiverAddressLower)) {
              allEvents.push({
                ...event,
                eventType: "ESCROW_CREATED",
                tokenType: determineTokenTypeFromContract(event.contractId_),
              });
            }
          }
        });
      }

      // Process withdrawal events
      if (data.tokenWithdrawns) {
        data.tokenWithdrawns.forEach((event: any) => {
          if (event.recipient && event.recipient.toLowerCase() === receiverAddressLower) {
            withdrawEvents.push({
              escrowId: event.escrowId,
              recipient: event.recipient,
              amount: event.amount,
              timestamp: new Date(parseInt(event.timestamp_) * 1000),
              transactionHash: event.transactionHash_,
              blockNumber: event.block_number,
              depositWallet: event.depositWallet,
              tokenType: determineTokenTypeFromContract(event.contractId_),
            });
          }
        });
      }

      if (data.tokenWithdrawnToFiats) {
        data.tokenWithdrawnToFiats.forEach((event: any) => {
          if (event.recipient && event.recipient.toLowerCase() === receiverAddressLower) {
            withdrawEvents.push({
              escrowId: event.escrowId,
              recipient: event.recipient,
              amount: event.amount,
              timestamp: new Date(parseInt(event.timestamp_) * 1000),
              transactionHash: event.transactionHash_,
              blockNumber: event.block_number,
              depositWallet: event.depositWallet,
              tokenType: determineTokenTypeFromContract(event.contractId_),
            });
          }
        });
      }

      // Sort all events by timestamp
      allEvents.sort((a, b) => parseInt(b.timestamp_) - parseInt(a.timestamp_));
      withdrawEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      console.log("📊 Receiver events data:", { escrowEvents: allEvents, withdrawEvents });
      setReceiverEvents(allEvents);
      setWithdrawEvents(withdrawEvents);
    } catch (error) {
      console.error("❌ Error fetching receiver events:", error);
      setReceiverEvents([]);
      setWithdrawEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    console.log("🔍 History page - effectiveWalletAddress:", effectiveWalletAddress);
    console.log("🔍 History page - address:", address);
    
    if (effectiveWalletAddress && isConnected) {
      if (activeTab === "sender") {
        fetchSenderEvents();
      } else {
        fetchReceiverEvents();
      }
    }
  }, [effectiveWalletAddress, activeTab, isConnected]);

  // Filter events based on search and filters
  const getFilteredEvents = () => {
    if (activeTab === "sender") {
      return senderEvents.filter((event) => {
        const matchesSearch = 
          event.escrowId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.transactionHash_.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.tokenType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.eventType.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = 
          eventTypeFilter === "all" || 
          event.eventType === eventTypeFilter;

        return matchesSearch && matchesType;
      });
    } else {
      // For receiver tab, combine escrow events and withdrawal events
      const allEvents = [...receiverEvents];
      
      // Add withdrawal events as special events
      withdrawEvents.forEach(withdraw => {
        allEvents.push({
          escrowId: withdraw.escrowId,
          sender: "",
          tokenAddress: "",
          block_number: withdraw.blockNumber,
          timestamp_: Math.floor(withdraw.timestamp.getTime() / 1000).toString(),
          transactionHash_: withdraw.transactionHash,
          contractId_: "",
          eventType: "WITHDRAWAL",
          tokenType: withdraw.tokenType,
          amount: withdraw.amount,
          depositWallet: withdraw.depositWallet,
        } as any);
      });

      return allEvents.filter((event) => {
        const matchesSearch = 
          event.escrowId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.transactionHash_.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.tokenType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.eventType.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = 
          eventTypeFilter === "all" || 
          event.eventType === eventTypeFilter;

        return matchesSearch && matchesType;
      });
    }
  };

  const filteredEvents = getFilteredEvents();

  // Calculate statistics
  const getStats = () => {
    const events = activeTab === "sender" ? senderEvents : receiverEvents;
    const totalEscrows = events.length;
    const totalAmount = events.reduce((sum, event) => sum + parseFloat(event.totalAmount || "0"), 0);
    const uniqueTokens = new Set(events.map(e => e.tokenType)).size;
    const totalWithdraws = withdrawEvents.length;

    return [
      {
        icon: <Plus className="w-5 h-5 text-green-400" />,
        value: totalEscrows,
        label: "Total Escrows",
        iconBgColor: "bg-green-500/20",
      },
      {
        icon: <DollarSign className="w-5 h-5 text-blue-400" />,
        value: `$${totalAmount.toFixed(2)}`,
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
        value: totalWithdraws,
        label: "Withdrawals",
        iconBgColor: "bg-orange-500/20",
      },
    ];
  };

  // Format event data
  const formatEventData = (event: EscrowEvent) => {
    const tokenType = event.tokenType || "Unknown";
    
    switch (event.eventType) {
      case "ESCROW_CREATED":
        const totalAmount = parseFloat(event.totalAmount || "0");
        const receiverCount = event.receivers?.length || 0;
        return {
          description: `Created escrow with ${receiverCount} recipients`,
          amount: totalAmount,
          tokenType,
          receiverCount,
          color: "bg-green-100 text-green-800 border-green-200",
          label: "Escrow Created"
        };
      
      case "TOPUP_FUNDS":
        const topupAmount = parseFloat(event.amount || "0");
        return {
          description: `Added funds to escrow`,
          amount: topupAmount,
          tokenType,
          color: "bg-blue-100 text-blue-800 border-blue-200",
          label: "Funds Added"
        };
      
      case "ADD_RECIPIENTS":
        const addAmount = parseFloat(event.amount || "0");
        return {
          description: `Added recipient: ${event.receiver?.slice(0, 6)}...${event.receiver?.slice(-4)}`,
          amount: addAmount,
          tokenType,
          color: "bg-purple-100 text-purple-800 border-purple-200",
          label: "Recipient Added"
        };
      
      case "REMOVE_RECIPIENTS":
        const refundAmount = parseFloat(event.refundAmount || "0");
        return {
          description: `Removed recipient: ${event.receiver?.slice(0, 6)}...${event.receiver?.slice(-4)}`,
          amount: refundAmount,
          tokenType,
          color: "bg-red-100 text-red-800 border-red-200",
          label: "Recipient Removed"
        };
      
      case "UPDATE_RECIPIENTS_AMOUNT":
        const oldAmount = parseFloat(event.oldAmount || "0");
        const newAmount = parseFloat(event.newAmount || "0");
        return {
          description: `Updated recipient amount: ${event.receiver?.slice(0, 6)}...${event.receiver?.slice(-4)}`,
          amount: newAmount,
          tokenType,
          oldAmount,
          color: "bg-yellow-100 text-yellow-800 border-yellow-200",
          label: "Amount Updated"
        };
      
      case "WITHDRAWAL":
        const withdrawAmount = parseFloat(event.amount || "0");
        const depositWallet = event.depositWallet;
        return {
          description: depositWallet 
            ? `Withdrew to fiat via ${depositWallet.slice(0, 6)}...${depositWallet.slice(-4)}`
            : "Withdrew to crypto wallet",
          amount: withdrawAmount,
          tokenType,
          color: "bg-orange-100 text-orange-800 border-orange-200",
          label: "Withdrawal"
        };
      
      default:
        return {
          description: "Escrow activity",
          amount: 0,
          tokenType,
          color: "bg-gray-100 text-gray-800 border-gray-200",
          label: "Unknown Event"
        };
    }
  };

  // Format date
  const formatDate = (timestamp: string) => {
    const date = new Date(parseInt(timestamp) * 1000);
    return date.toLocaleString();
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
        <div className="container mx-auto">
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
                title="Transaction History"
                subtitle="Your escrow events and activities from blockchain"
                backPath="/dashboard"
                walletAddress={effectiveWalletAddress}
              />

              {/* Content */}
              <div className="space-y-6">
                {/* Tab Navigation */}
                <div className="flex space-x-1 bg-gray-800/50 p-1 rounded-lg">
                  <button
                    onClick={() => setActiveTab("sender")}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === "sender"
                        ? "bg-cyan-600 text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Sender Events
                  </button>
                  <button
                    onClick={() => setActiveTab("receiver")}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === "receiver"
                        ? "bg-cyan-600 text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Receiver Events
                  </button>
                </div>

                {/* Stats Cards */}
                <StatsCards stats={getStats()} columns={4} />

                {/* Search and Filters */}
                <SearchFilterBar
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  searchPlaceholder="Search by escrow ID, transaction hash, or token type..."
                  statusFilter={{
                    value: eventTypeFilter,
                    options: [
                      { value: "all", label: "All Events" },
                      { value: "ESCROW_CREATED", label: "Escrow Created" },
                      { value: "TOPUP_FUNDS", label: "Funds Added" },
                      { value: "ADD_RECIPIENTS", label: "Recipients Added" },
                      { value: "REMOVE_RECIPIENTS", label: "Recipients Removed" },
                      { value: "UPDATE_RECIPIENTS_AMOUNT", label: "Amount Updated" },
                      { value: "WITHDRAWAL", label: "Withdrawals" },
                    ],
                    onChange: (value: string) => setEventTypeFilter(value as any),
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
                    onChange: (value: string) => setSelectedTimeRange(value as any),
                  }}
                />

                {/* Events List */}
                {loadingEvents ? (
                  <LoadingState message="Loading events from blockchain..." />
                ) : filteredEvents.length === 0 ? (
                  <EmptyState
                    icon={<Activity className="w-8 h-8 text-gray-500" />}
                    title="No Events Found"
                    description={
                      searchTerm
                        ? `No results for "${searchTerm}"`
                        : `No ${activeTab} events available`
                    }
                  />
                ) : (
                  <div className="space-y-4">
                    {filteredEvents.map((event, index) => {
                      const eventInfo = formatEventData(event);
                      const withdraws = withdrawEvents.filter(w => w.escrowId === event.escrowId);

                      return (
                        <div
                          key={`${event.escrowId}-${event.eventType}-${index}`}
                          className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 hover:bg-gray-800/70 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${eventInfo.color}`}>
                                  {eventInfo.label}
                                </span>
                                <span className="text-sm text-gray-400">
                                  {eventInfo.tokenType}
                                </span>
                              </div>

                              <div className="mb-3">
                                <p className="text-white font-medium">
                                  {eventInfo.description}
                                </p>
                                <p className="text-sm text-gray-400">
                                  Escrow: {event.escrowId}
                                </p>
                                {eventInfo.amount > 0 && (
                                  <p className="text-sm text-cyan-400">
                                    Amount: {eventInfo.amount} {eventInfo.tokenType}
                                  </p>
                                )}
                                {eventInfo.oldAmount && (
                                  <p className="text-sm text-yellow-400">
                                    Previous: {eventInfo.oldAmount} {eventInfo.tokenType}
                                  </p>
                                )}
                                {withdraws.length > 0 && (
                                  <p className="text-sm text-orange-400">
                                    {withdraws.length} withdrawal(s) made
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="text-sm text-gray-400">
                                {formatDate(event.timestamp_)}
                              </p>
                              <a
                                href={`https://etherscan.io/tx/${event.transactionHash_}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                              >
                                <span>View Transaction</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
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