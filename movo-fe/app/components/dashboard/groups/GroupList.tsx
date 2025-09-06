"use client";

import { deleteGroup, loadSpecifiedGroup } from "@/app/api/api";
import { useAuth } from "@/lib/userContext";
import { GroupOfUser } from "@/types/receiverInGroupTemplate";
import { ReceiverInGroup } from "@/types/receiverInGroupTemplate";
import { Users, ArrowRight, Clock, Delete, DollarSign } from "lucide-react";
import { useState, useEffect } from "react";

interface GroupListProps {
  groups: GroupOfUser[];
  onGroupSelect?: (groupId: string) => void;
  isLoading: boolean;
  onGroupDeleted?: () => void;
  onTopupFund?: (groupId: string) => void;
}

const getTotalAmount = (
  receivers: ReceiverInGroup[] | undefined | null,
): number => {
  if (!Array.isArray(receivers)) return 0;
  return receivers.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
};

const formatDate = (date?: Date | string | null): string => {
  if (!date) return "-";
  const parsedDate = date instanceof Date ? date : new Date(date);
  if (isNaN(parsedDate.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);
};

export default function GroupList({
  groups,
  onGroupSelect,
  isLoading,
  onGroupDeleted,
  onTopupFund,
}: GroupListProps) {
  const { user, loading } = useAuth();
  const [escrowData, setEscrowData] = useState<{ [key: string]: any }>({});
  const [escrowLoading, setEscrowLoading] = useState<{
    [key: string]: boolean;
  }>({});

  // Load escrow data for all groups
  useEffect(() => {
    const loadEscrowData = async () => {
      for (const group of groups) {
        if (!escrowData[group.groupId] && !escrowLoading[group.groupId]) {
          setEscrowLoading((prev) => ({ ...prev, [group.groupId]: true }));
          try {
            const data = await loadSpecifiedGroup(user._id, group.groupId);
            setEscrowData((prev) => ({ ...prev, [group.groupId]: data }));
          } catch (error) {
            // If no escrow found, set to null
            setEscrowData((prev) => ({ ...prev, [group.groupId]: null }));
          } finally {
            setEscrowLoading((prev) => ({ ...prev, [group.groupId]: false }));
          }
        }
      }
    };

    if (groups.length > 0) {
      loadEscrowData();
    }
  }, [groups]);

  // Helper function to get dynamic recipient count
  const getDynamicRecipientCount = (groupId: string) => {
    const escrow = escrowData[groupId];
    if (escrow && escrow.receivers) {
      return escrow.receivers.length;
    }
    return "-"; // No escrow yet
  };

  // Helper function to get dynamic total amount
  const getDynamicTotalAmount = (groupId: string) => {
    const escrow = escrowData[groupId];
    if (escrow && escrow.totalAmount && escrow.tokenType) {
      // Convert from wei/smallest unit to human readable
      const amount = parseFloat(escrow.totalAmount);
      const decimals = escrow.tokenType === "USDC" ? 6 : 2;
      const humanAmount = amount / Math.pow(10, decimals);
      return `${humanAmount.toFixed(decimals === 6 ? 2 : 0)} ${escrow.tokenType}`;
    }
    return "-"; // No escrow yet
  };

  // Helper function to get group status
  const getGroupStatus = (groupId: string) => {
    const escrow = escrowData[groupId];
    if (escrow) {
      return {
        text: "Escrow Active",
        color: "text-green-400",
        icon: "🟢",
      };
    }
    return {
      text: "No Escrow",
      color: "text-yellow-400",
      icon: "🟡",
    };
  };

  if (isLoading) {
    return (
      <div className="text-center p-12 text-white/60">Loading groups...</div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="bg-white/5 rounded-2xl border border-white/10 p-12 text-center">
        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-white/40" />
        </div>
        <div className="text-white/60 mb-2">No groups found</div>
        <div className="text-white/40 text-sm">
          Create your first payment group to get started.
        </div>
      </div>
    );
  }

  const handleSelect = (groupId: string) => {
    if (onGroupSelect) {
      onGroupSelect(groupId);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    // Tampilkan popup konfirmasi
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this group? This action cannot be undone.",
    );
    if (!confirmDelete) return; // user batal, langsung keluar

    try {
      const groupDeleted = await deleteGroup(user._id, groupId);
      console.log(groupDeleted);
      // Panggil callback setelah sukses delete
      if (onGroupDeleted) onGroupDeleted();
    } catch (err) {
      console.log(err);
      return;
    }
  };

  return (
    <>
      {/* Tampilan Kartu untuk Mobile */}
      <div className="lg:hidden space-y-4">
        {groups.map((group) => {
          const groupStatus = getGroupStatus(group.groupId);
          const recipientCount = getDynamicRecipientCount(group.groupId);
          const totalAmount = getDynamicTotalAmount(group.groupId);

          return (
            <div
              key={group.groupId}
              onClick={() => handleSelect(group.groupId)}
              className="bg-white/5 rounded-xl p-4 border border-white/10"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-white font-medium">
                      {group.nameOfGroup}
                    </div>
                    <div className="text-white/60 text-sm">
                      by {group.senderName}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <div className="text-white/60">Recipients</div>
                  <div className="text-white font-medium">
                    {escrowLoading[group.groupId] ? (
                      <span className="text-white/40">Loading...</span>
                    ) : (
                      recipientCount
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-white/60">Total Amount</div>
                  <div className="text-white font-medium">
                    {escrowLoading[group.groupId] ? (
                      <span className="text-white/40">Loading...</span>
                    ) : (
                      totalAmount
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{groupStatus.icon}</span>
                  <span className={`text-sm ${groupStatus.color}`}>
                    {groupStatus.text}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(group.groupId);
                  }}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all flex items-center justify-center space-x-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Manage Group</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tampilan Tabel untuk Desktop */}
      <div className="hidden lg:block bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left p-4 text-white/80 font-medium">
                  Group Name
                </th>
                <th className="text-left p-4 text-white/80 font-medium">
                  Recipients
                </th>
                <th className="text-left p-4 text-white/80 font-medium">
                  Total Amount
                </th>
                <th className="text-left p-4 text-white/80 font-medium">
                  Created
                </th>
                <th className="text-left p-4 text-white/80 font-medium">
                  Status
                </th>
                <th className="text-left p-4 text-white/80 font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const groupStatus = getGroupStatus(group.groupId);
                const recipientCount = getDynamicRecipientCount(group.groupId);
                const totalAmount = getDynamicTotalAmount(group.groupId);

                return (
                  <tr
                    key={group.groupId}
                    onClick={() => handleSelect(group.groupId)} // klik row = select group
                    className="border-b border-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="text-white font-medium">
                            {group.nameOfGroup}
                          </div>
                          <div className="text-white/60 text-sm">
                            by {group.senderName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-white font-medium">
                      {escrowLoading[group.groupId] ? (
                        <span className="text-white/40">Loading...</span>
                      ) : (
                        recipientCount
                      )}
                    </td>
                    <td className="p-4 text-white font-medium">
                      {escrowLoading[group.groupId] ? (
                        <span className="text-white/40">Loading...</span>
                      ) : (
                        totalAmount
                      )}
                    </td>
                    <td className="p-4 text-white/80">
                      {formatDate(group.createdAt)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{groupStatus.icon}</span>
                        <span className={`text-sm ${groupStatus.color}`}>
                          {groupStatus.text}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // ⬅ biar klik ini ga trigger row
                          if (onTopupFund) onTopupFund(group.groupId);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                        title="Topup Fund to Escrow"
                      >
                        <DollarSign className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // ⬅ sama di sini
                          handleDeleteGroup(group.groupId);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        <Delete className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
