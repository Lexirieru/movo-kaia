"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/userContext";
import { loadSpecifiedGroup } from "@/app/api/api";
import { GroupOfUser } from "@/types/receiverInGroupTemplate";
import { ArrowLeft, Users, DollarSign, Calendar, Eye } from "lucide-react";
import PageHeader from "@/app/components/layout/PageHeader";
import LoadingState from "@/app/components/shared/LoadingState";
import EmptyState from "@/app/components/shared/EmptyState";
import StatsCards from "@/app/components/shared/StatsCards";
import ReceiverItem from "@/app/components/history/ReceiverItem";
import ReceiverDetailModal from "@/app/components/history/ReceiverDetailModal";
interface PageProps {
  params: {
    groupId: string;
  };
}

export default function GroupDetailPage({ params }: PageProps) {
  const { user, currentWalletAddress } = useAuth();
  const router = useRouter();
  const [group, setGroup] = useState<GroupOfUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReceiver, setSelectedReceiver] = useState<any>(null);
  const [showReceiverModal, setShowReceiverModal] = useState(false);

  useEffect(() => {
    const fetchGroupDetail = async () => {
      if (!user?._id || !currentWalletAddress) return;
      
      try {
        const groupData = await loadSpecifiedGroup(user._id, params.groupId);
        if (groupData) {
          setGroup(groupData);
        }
      } catch (error) {
        console.error("Error fetching group details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroupDetail();
  }, [user?._id, currentWalletAddress, params.groupId]);

  const handleReceiverClick = (receiver: any) => {
    setSelectedReceiver(receiver);
    setShowReceiverModal(true);
  };

  if (loading) {
    return <LoadingState message="Loading group details..." fullScreen />;
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
        <PageHeader
          title="Group Not Found"
          backPath="/history/sender"
          walletAddress={currentWalletAddress}
        />
        <div className="container mx-auto px-4 py-6">
          <EmptyState
            icon={<Users className="w-8 h-8 text-gray-500" />}
            title="Group Not Found"
            description="The requested group could not be found."
            action={{
              label: "Back to Groups",
              onClick: () => router.push("/history/sender")
            }}
          />
        </div>
      </div>
    );
  }

  const totalAmount = group.Receivers?.reduce((sum, receiver) => sum + ((receiver.amount) || 0), 0) || 0;
  const recipientCount = group.Receivers?.length || 0;

  const statsData = [
    {
      icon: <DollarSign className="w-5 h-5 text-blue-400" />,
      value: `$${totalAmount.toFixed(2)}`,
      label: "Total Amount",
      iconBgColor: "bg-blue-500/20"
    },
    {
      icon: <Users className="w-5 h-5 text-green-400" />,
      value: recipientCount,
      label: "Recipients",
      iconBgColor: "bg-green-500/20"
    },
  ];
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Header */}
      <PageHeader
        title={group.nameOfGroup}
        subtitle="Group Details"
        backPath="/history/sender"
        walletAddress={currentWalletAddress}
      />

      {/* Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Group Summary Stats */}
        <StatsCards stats={statsData} columns={3} />

        {/* Recipients List */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Recipients</h2>
          
          {group.Receivers && group.Receivers.length > 0 ? (
            <div className="space-y-3">
              {group.Receivers.map((receiver, index) => (
                <ReceiverItem
                  key={index}
                  receiver={receiver}
                  onViewDetails={handleReceiverClick}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Users className="w-8 h-8 text-gray-500" />}
              title="No Recipients"
              description="No recipients have been added to this group yet."
            />
          )}
        </div>
      </div>

      {/* Receiver Detail Modal */}
      <ReceiverDetailModal
        isOpen={showReceiverModal}
        onClose={() => setShowReceiverModal(false)}
        receiver={selectedReceiver}
        groupName={group.nameOfGroup}
      />
    </div>
  );
}