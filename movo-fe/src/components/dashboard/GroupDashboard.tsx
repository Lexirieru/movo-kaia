"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/userContext";
import { useWallet } from "@/lib/walletContext";
import { GroupOfUser } from "@/types/receiverInGroupTemplate";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import GroupStatsCards from "./groups/GroupsStatsCards";
import GroupFilterBar from "./groups/GroupFilterBar";
import EscrowList from "./EscrowList";
import TopupFundModal from "./groups/TopupFundModal";
import {
  loadAllGroup,
  addGroup,
  updateWalletAddressRole,
  fetchEscrowsFromIndexer,
} from "@/app/api/api";

interface GroupDashboardProps {
  onRoleChange?: () => void;
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
}

export default function GroupDashboard({ onRoleChange }: GroupDashboardProps) {
  const { user, loading } = useAuth();
  const { address, isConnected } = useWallet();
  const [escrows, setEscrows] = useState<EscrowData[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [selectedEscrowId, setSelectedEscrowId] = useState<string | null>(null);

  // Function to refresh escrows data
  const refreshEscrows = async () => {
    if (!address) return;
    
    try {
      console.log("🔄 Refreshing escrows data...");
      const escrowsData: EscrowData[] = await fetchEscrowsFromIndexer(address);
      console.log("📊 Refreshed escrows data:", escrowsData);
      setEscrows(escrowsData);
    } catch (err) {
      console.error("❌ Failed to refresh escrows from indexer", err);
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
        console.log("🔍 Fetching escrows from indexer for address:", address);
        const escrowsData: EscrowData[] = await fetchEscrowsFromIndexer(address);
        console.log("📊 Received escrows data:", escrowsData);
        setEscrows(escrowsData);
        setHasFetched(true);
      } catch (err) {
        console.error("❌ Failed to fetch escrows from indexer", err);
        setHasFetched(true); // Set to true even on error to prevent infinite retry
      }
    };
    fetchEscrows();
  }, [loading, isConnected, address]); // Removed hasFetched from dependencies

  // --- LOGIKA FILTER & KALKULASI ---
  const filteredEscrows = escrows.filter((escrow) =>
    escrow.escrowId.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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
          console.log("🔍 Force fetching escrows from indexer for address:", address);
          const escrowsData: EscrowData[] = await fetchEscrowsFromIndexer(address);
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

  const handleEscrowDeleted = () => {
    // Reset fetch flag supaya useEffect dijalankan lagi
    setHasFetched(false);
  };

  const handleTopupFund = (escrowId: string) => {
    setSelectedEscrowId(escrowId);
    setIsTopupModalOpen(true);
  };

  const handleEscrowSelect = (escrowId: string) => {
    router.push(`/dashboard/sender/${escrowId}`);
  };

  const handleCreateGroup = async (groupData: { nameOfGroup: string }) => {
    try {
      // Tunggu user siap
      if (loading || !user?._id || !user?.email) {
        console.log("Waiting for user to load...");
        await new Promise((resolve) => {
          const checkUser = setInterval(() => {
            if (!loading && user?._id && user?.email) {
              clearInterval(checkUser);
              resolve(true);
            }
          }, 50);
        });
      }
      console.log(user);
      // Generate unique group ID
      const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      // Create new group object
      const newGroup: GroupOfUser = {
        groupId,
        nameOfGroup: groupData.nameOfGroup,
        senderId: user?._id || "",
        senderName: user?.fullname || "",
        Receivers: [],
        totalReceiver: 0,
        createdAt: new Date().toString(),
      };
      if (!user || !address) throw new Error("User or wallet address not found");
      const response = await addGroup(
        user._id,
        user.email,
        groupId,
        groupData.nameOfGroup,
        address,
      );

      const giveRoleSender = await updateWalletAddressRole(
        user._id,
        address,
        "sender",
      );

      console.log("Role update response:", giveRoleSender);

      if (response && response.data) {
        if (onRoleChange) {
          onRoleChange();
        }
        router.push(`/dashboard/sender/${groupId}`);
      }
    } catch (err) {
      console.error("Failed to create group", err);
      //   setGroups(prev => prev.filter(g => g.groupId != groupId))
    }
  };

  // Show loading or wallet connection message
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">Loading...</p>
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
            <h2 className="text-3xl font-bold text-white mb-2">My Escrows</h2>
            <p className="text-white/60">
              Manage your escrow contracts and track token distributions.
            </p>
            <p className="text-cyan-400 text-sm mt-1">
              Connected: {address.slice(0, 6)}...{address.slice(-4)}
            </p>
          </div>
        </div>

        {/* --- RENDER KOMPONEN ANAK --- */}

        {/* 1. Kartu Statistik */}
        <GroupStatsCards groups={[]} />

        {/* 2. Bar Pencarian dan Filter */}
        <GroupFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filterType={filterType}
          onFilterChange={setFilterType}
        />

        {/* 3. Daftar Escrow (Responsif) */}
        <EscrowList
          escrows={filteredEscrows}
          onEscrowSelect={handleEscrowSelect}
          isLoading={!hasFetched && loading}
          onEscrowDeleted={handleEscrowDeleted}
          onTopupFund={handleTopupFund}
        />


        {/* Topup Fund Modal */}
        <TopupFundModal
          isOpen={isTopupModalOpen}
          onClose={() => setIsTopupModalOpen(false)}
          escrowId={selectedEscrowId || ""}
        />
      </div>
    </div>
  );
}
