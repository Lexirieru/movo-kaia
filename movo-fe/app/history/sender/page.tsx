"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/userContext";
import { useRouter } from "next/navigation";
import { loadAllGroup, loadAllGroupTransactionHistory } from "@/app/api/api";
import { GroupOfUser } from "@/types/receiverInGroupTemplate";
import { ArrowLeft, Users, DollarSign, Calendar } from "lucide-react";
import Image from "next/image";
import PageHeader from "@/app/components/layout/PageHeader";
import LoadingState from "@/app/components/shared/LoadingState";
import EmptyState from "@/app/components/shared/EmptyState";
import GroupCard from "@/app/components/history/GroupCard";
import MainLayout from "@/app/components/layout/MainLayout";
import BottomNavbar from "@/app/components/shared/BottomNavbar";

export default function SenderHistoryPage() {
  const { user, currentWalletAddress } = useAuth();
  const [groups, setGroups] = useState<GroupOfUser[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchGroups = async () => {
      if (!user?._id || !currentWalletAddress) return;

      try {
        const groupData = await loadAllGroupTransactionHistory(
          user._id,
          currentWalletAddress,
        );
        if (Array.isArray(groupData)) {
          setGroups(groupData);
        }
      } catch (err) {
        console.error("Error fetching groups", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();
  }, [user?._id, currentWalletAddress]);

  const handleGroupClick = (groupId: string) => {
    router.push(`/history/sender/${groupId}`);
  };

  if (loading) {
    return <LoadingState message="Loading groups..." fullScreen />;
  }

  return (
    <MainLayout>
      {/* Header */}
      <PageHeader
        title="Group History"
        subtitle="Your payment groups overview"
        backPath="/dashboard"
        walletAddress={currentWalletAddress}
      />

      {/* Content */}
      <div className="container mx-auto p-6 pb-6">
        {groups.length === 0 ? (
          <EmptyState
            icon={<Users className="w-8 h-8 text-gray-500" />}
            title="No Groups Found"
            description="You haven't created any payment groups yet."
            action={{
              label: "Back to Dashboard",
              onClick: () => router.push("/dashboard"),
            }}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <GroupCard
                key={group.groupId}
                group={group}
                onClick={handleGroupClick}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
