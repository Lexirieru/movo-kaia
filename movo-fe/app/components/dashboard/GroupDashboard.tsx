"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/userContext";
import { GroupOfUser } from "@/types/receiverInGroupTemplate";
import { useRouter } from "next/navigation";
import GroupStatsCards from "./groups/GroupsStatsCards";
import GroupFilterBar from "./groups/GroupFilterBar";
import GroupList from "./groups/GroupList";
import { Plus } from "lucide-react";
import CreateGroupModal from "./groups/CreateGroupModal";
import TopupFundModal from "./groups/TopupFundModal";
import { loadAllGroup, addGroup } from "@/app/api/api";

export default function GroupDashboard() {
  const { user, loading } = useAuth();
  const [groups, setGroups] = useState<GroupOfUser[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !user?._id || hasFetched) return;
    const fetchGroups = async () => {
      try {
        const groupData = await loadAllGroup(user._id);
        if (Array.isArray(groupData)) {
          const formattedGroups: GroupOfUser[] = groupData.map(
            (g: GroupOfUser) => ({
              ...g,
              createdAt: g.createdAt || new Date().toISOString(),
            }),
          );
          setGroups(formattedGroups);
        }
        setHasFetched(true);
      } catch (err) {
        console.error("Gagal memuat data grup", err);
      }
    };
    fetchGroups();
  }, [loading, user, hasFetched]);

  // --- LOGIKA FILTER & KALKULASI ---
  const filteredGroups = groups.filter((group) =>
    (group.nameOfGroup ?? "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleGroupDeleted = () => {
    // Reset fetch flag supaya useEffect dijalankan lagi
    setHasFetched(false);
  };

  const handleTopupFund = (groupId: string) => {
    setSelectedGroupId(groupId);
    setIsTopupModalOpen(true);
  };

  const handleGroupSelect = (groupId: string) => {
    router.push(`/dashboard/sender/${groupId}`);
  };

  const handleCreateGroup = async (groupData: { groupName: string }) => {
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
        nameOfGroup: groupData.groupName,
        senderId: user?._id || "",
        senderName: user?.fullname || "",
        Receivers: [],
        totalRecipients: 0,
        createdAt: new Date().toString(),
      };
      // Add to local state immediately for better UX
      setGroups((prev) => [newGroup, ...prev]);
      const response = await addGroup(
        user._id,
        user.email,
        groupId,
        groupData.groupName,
      );
      if (response && response.data) {
        setIsCreateModalOpen(false);
        router.push(`/dashboard/sender/${groupId}`);
      }
    } catch (err) {
      console.error("Failed to create group", err);
      //   setGroups(prev => prev.filter(g => g.groupId != groupId))
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">My Groups</h2>
            <p className="text-white/60">
              Manage your payment groups and track distributions.
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 flex items-center space-x-2 hover:scale-105 group w-fit"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            <span>Create New Group</span>
          </button>
        </div>

        {/* --- RENDER KOMPONEN ANAK --- */}

        {/* 1. Kartu Statistik */}
        <GroupStatsCards groups={groups} />

        {/* 2. Bar Pencarian dan Filter */}
        <GroupFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filterType={filterType}
          onFilterChange={setFilterType}
        />

        {/* 3. Daftar Grup (Responsif) */}
        <GroupList
          groups={filteredGroups}
          onGroupSelect={handleGroupSelect}
          isLoading={!hasFetched && loading}
          onGroupDeleted={handleGroupDeleted}
          onTopupFund={handleTopupFund}
        />

        {/* Create Group Modal */}
        <CreateGroupModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreateGroup={handleCreateGroup}
        />

        {/* Topup Fund Modal */}
        <TopupFundModal
          isOpen={isTopupModalOpen}
          onClose={() => setIsTopupModalOpen(false)}
          groupId={selectedGroupId || ""}
        />
      </div>
    </div>
  );
}
