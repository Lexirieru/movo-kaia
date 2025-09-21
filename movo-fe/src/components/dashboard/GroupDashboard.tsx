"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/userContext";
import { useWallet } from "@/lib/walletContext";
import { GroupOfUser, ReceiverInGroup } from "@/types/receiverInGroupTemplate";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import GroupStatsCards from "./groups/GroupsStatsCards";
import GroupFilterBar from "./groups/GroupFilterBar";
import EscrowList from "./EscrowList";
import CreateStreamModal from "./sender/CreateStreamModal";
import {
  fetchEscrowsFromIndexer,
} from "@/app/api/api";


interface GroupDashboardProps {
  onRoleChange?: () => void;
  viewMode?: "default" | "claimable-sender";
  claimableEscrows?: EscrowData[];
}

interface EscrowData {
  id: string;
  escrowId: string;
  sender: string;
  totalAmount: string;
  createdAt: string;
  receivers: string[];
  amounts: string[];
  tokenAddress: string;
  availableBalance?: string;
  [key: string]: any; // For additional properties
}

export default function GroupDashboard({
  onRoleChange,
  viewMode = "default",
  claimableEscrows = [],
}: GroupDashboardProps) {
  const { user, loading, currentWalletAddress } = useAuth();
  const { address, isConnected } = useWallet();
  const [escrows, setEscrows] = useState<EscrowData[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [selectedEscrowId, setSelectedEscrowId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [closedEscrows, setClosedEscrows] = useState<Set<string>>(new Set());
  // Debug: Log claimable escrows received
  useEffect(() => {
    if (viewMode === "claimable-sender") {
      console.log("🔍 GroupDashboard: Received claimable escrows:", {
        viewMode,
        claimableEscrowsCount: claimableEscrows.length,
        escrows: claimableEscrows.map((escrow) => ({
          escrowId: escrow.escrowId,
          tokenType: escrow.tokenType || "Unknown",
          dataSource: escrow.dataSource || "Unknown",
          availableBalance: escrow.availableBalance,
          totalAmount: escrow.totalAmount,
        })),
      });
    }
  }, [viewMode, claimableEscrows]);

  // Function to refresh escrows data
  const refreshEscrows = async () => {
    if (!address) return;

    try {
      console.log("🔄 Refreshing escrows data...");
      setIsCheckingStatus(true);
      const escrowsData: EscrowData[] = await fetchEscrowsFromIndexer(address);
      console.log("📊 Refreshed escrows data:", escrowsData);
      setEscrows(escrowsData);
      setClosedEscrows(new Set());
    } catch (err) {
      console.error("❌ Failed to refresh escrows from indexer", err);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  useEffect(() => {
    if (loading || !isConnected || !address) return;

    console.log("🚀 Starting escrow fetch process...");
    console.log("📱 Connected wallet address:", address);
    console.log("🔗 Wallet connected:", isConnected);
    console.log("🔄 Has fetched:", hasFetched);
    console.log("⏰ Timestamp:", new Date().toISOString());

    const fetchEscrows = async () => {
      try {
        // console.log("🔍 Fetching escrows from indexer for address:", address);
        // const escrowsData: EscrowData[] =
        //   await fetchEscrowsFromIndexer(address);
        // console.log("📊 Received escrows data:", escrowsData);
        // setEscrows(escrowsData);
        // setHasFetched(true);
        await refreshEscrows();
        setHasFetched(true);
      } catch (err) {
        console.error("❌ Failed to fetch escrows from indexer", err);
        setHasFetched(true);
      }
    };
    fetchEscrows();
  }, [loading, isConnected, address]);

  // --- LOGIKA FILTER & KALKULASI ---
  // Use claimableEscrows if in claimable-sender mode, otherwise use regular escrows
  const displayEscrows = useMemo(() => {
    const baseEscrows =
      viewMode === "claimable-sender" ? claimableEscrows : escrows;
    const filteredEscrows = baseEscrows.filter((escrow) => !closedEscrows.has(escrow.escrowId)   );
    return filteredEscrows
  }, [viewMode, claimableEscrows, escrows, closedEscrows]);

  // Reset hasFetched ketika address berubah
  useEffect(() => {
    console.log("🔄 Wallet address changed, resetting fetch state");
    setHasFetched(false);
    setEscrows([]); // Clear existing escrows when wallet changes
  }, [address]);

  // Reset hasFetched ketika wallet connection status berubah
  useEffect(() => {
    if (!isConnected) {
      console.log("🔄 Wallet disconnected, resetting fetch state");
      setHasFetched(false);
      setEscrows([]);
    }
  }, [isConnected]);

  // Force refresh when address changes (for wallet switching without disconnect)
  useEffect(() => {
    if (address && isConnected) {
      console.log("🔄 Wallet address changed, forcing refresh");
      setHasFetched(false);
      setEscrows([]);

      // Trigger immediate refresh
      const forceRefresh = async () => {
        try {
          console.log(
            "🔍 Force fetching escrows from indexer for address:",
            address,
          );
          const escrowsData: EscrowData[] =
            await fetchEscrowsFromIndexer(address);
          console.log("📊 Force refreshed escrows data:", escrowsData);
          setEscrows(escrowsData);
          setHasFetched(true);
        } catch (err) {
          console.error("❌ Failed to force refresh escrows from indexer", err);
          setHasFetched(true);
        }
      };
      forceRefresh();
    }
  }, [address]);

  const handleEscrowDeleted = (deletedEscrowId?: string) => {
    if (deletedEscrowId) {
      setEscrows((prev) =>
        prev.filter((escrow) => escrow.escrowId !== deletedEscrowId),
      );
      setClosedEscrows((prev) => new Set(prev).add(deletedEscrowId));
      console.log("🚀 Immediately marked escrow as closed:", deletedEscrowId);
    }

    // Reset fetch flag and schedule a delayed refresh to sync with blockchain
    setTimeout(() => {
      console.log("🔄 Performing delayed refresh for blockchain sync");
      refreshEscrows();
    }, 3000);
  };

  const handleTopupFund = (escrowId: string) => {
    setSelectedEscrowId(escrowId);
    setIsTopupModalOpen(true);
  };

  const handleEscrowSelect = (escrowId: string) => {
    router.push(`/dashboard/sender/${escrowId}`);
  };

  // const handleCreateGroup = async (groupData: { nameOfGroup: string }) => {
  //   try {
  //     // Tunggu user siap
  //     if (loading || !user?._id || !user?.email) {
  //       console.log("Waiting for user to load...");
  //       await new Promise((resolve) => {
  //         const checkUser = setInterval(() => {
  //           if (!loading && user?._id && user?.email) {
  //             clearInterval(checkUser);
  //             resolve(true);
  //           }
  //         }, 50);
  //       });
  //     }
  //     console.log(user);
  //     // Generate unique group ID
  //     const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  //     // Create new group object
  //     const newGroup: GroupOfUser = {
  //       groupId,
  //       nameOfGroup: groupData.nameOfGroup,
  //       senderId: user?._id || "",
  //       senderName: user?.fullname || "",
  //       Receivers: [],
  //       totalReceiver: 0,
  //       createdAt: new Date().toString(),
  //     };
  //     if (!user || !address)
  //       throw new Error("User or wallet address not found");
  //     const response = await addGroup(
  //       user._id,
  //       user.email,
  //       groupId,
  //       groupData.nameOfGroup,
  //       address,
  //     );

  //     const giveRoleSender = await updateWalletAddressRole(
  //       user._id,
  //       address,
  //       "sender",
  //     );

  //     console.log("Role update response:", giveRoleSender);

  //     if (response && response.data) {
  //       if (onRoleChange) {
  //         onRoleChange();
  //       }
  //       router.push(`/dashboard/sender/${groupId}`);
  //     }
  //   } catch (err) {
  //     console.error("Failed to create group", err);
  //     //   setGroups(prev => prev.filter(g => g.groupId != groupId))
  //   }
  // };

  const handleCreateStream = (stream: ReceiverInGroup) => {
    console.log("Creating stream:", stream);
    // For now, just close the modal and maybe refresh
    setIsCreateModalOpen(false);
    // Optionally refresh escrows
    refreshEscrows();
  };

  const handleEscrowCreated = () => {
    console.log("Escrow created successfully");
    setIsCreateModalOpen(false);
    // Refresh escrows data
    refreshEscrows();
  };

  // Show loading or wallet connection message
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">
            {loading ? "Loading..." : "Checking escrow status..."}
          </p>
        </div>
      </div>
    );
  }

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-white/40" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Connect Your Wallet
          </h3>
          <p className="text-white/60 mb-6">
            Please connect your wallet to view your escrows.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            {viewMode === "claimable-sender" ? (
              <>
                <h2 className="text-3xl font-bold text-white mb-2">
                  Available Funded Escrow
                </h2>
                <p className="text-white/60">
                  Escrows you have funded where receivers can start claiming
                  their amount.
                </p>
                <div className="flex items-center space-x-4 mt-2">
                  <p className="text-cyan-400 text-sm">
                    Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
                  </p>
                  <span className="px-2 py-1 bg-orange-400/20 text-orange-400 text-xs rounded-full">
                    {displayEscrows.length} Ready to be claimed
                  </span>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold text-white mb-2">
                  My Escrows
                </h2>
                <p className="text-white/60">
                  Manage your escrow contracts and track token distributions.
                </p>
                <p className="text-cyan-400 text-sm mt-1">
                  Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
                </p>
              </>
            )}
          </div>

          {viewMode !== "claimable-sender" && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 flex items-center space-x-2 hover:scale-105 group w-fit"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
              <span>Create Escrow</span>
            </button>
          )}
        </div>

        {/* --- RENDER KOMPONEN ANAK --- */}

        {/* 1. Kartu Statistik */}
        {viewMode !== "claimable-sender" && (
          <GroupStatsCards groups={escrows as any} />
        )}

        {/* Custom Stats for Claimable Sender View */}
        {viewMode === "claimable-sender" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Claimable Escrows</p>
                  <p className="text-2xl font-bold text-orange-400">
                    {displayEscrows.length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-orange-400/20 rounded-lg flex items-center justify-center">
                  <span className="text-orange-400 text-xl">⚡</span>
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Total Recipients</p>
                  <p className="text-2xl font-bold text-white">
                    {displayEscrows.reduce(
                      (sum, escrow) => sum + (escrow.receivers?.length || 0),
                      0,
                    )}
                  </p>
                </div>
                <div className="w-10 h-10 bg-blue-400/20 rounded-lg flex items-center justify-center">
                  <span className="text-blue-400 text-xl">👥</span>
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Available Balance</p>
                  <p className="text-2xl font-bold text-green-400">
                    {displayEscrows
                      .reduce((sum, escrow) => {
                        const balance = parseFloat(
                          escrow.availableBalance || "0",
                        );
                        return sum + balance;
                      }, 0)
                      .toFixed(2)}
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-400/20 rounded-lg flex items-center justify-center">
                  <span className="text-green-400 text-xl">💰</span>
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Total Allocated</p>
                  <p className="text-2xl font-bold text-white">
                    {displayEscrows
                      .reduce((sum, escrow) => {
                        const total = parseFloat(escrow.totalAmount || "0");
                        return sum + total;
                      }, 0)
                      .toFixed(2)}
                  </p>
                </div>
                <div className="w-10 h-10 bg-purple-400/20 rounded-lg flex items-center justify-center">
                  <span className="text-purple-400 text-xl">📊</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Bar Pencarian dan Filter */}
        <GroupFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filterType={filterType}
          onFilterChange={setFilterType}
        />

        {/* 3. Daftar Escrow (Responsif) */}
        <EscrowList
          escrows={displayEscrows}
          onEscrowSelect={handleEscrowSelect}
          isLoading={!hasFetched && loading}
          onEscrowDeleted={handleEscrowDeleted}
          onTopupFund={handleTopupFund}
        />

        {/* Create Stream Modal */}
        <CreateStreamModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreateStream={handleCreateStream}
          onEscrowCreated={handleEscrowCreated}
        />


      </div>
    </div>
  );
}
