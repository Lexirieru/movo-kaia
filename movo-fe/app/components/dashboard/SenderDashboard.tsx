"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Plus,
  Clock,
  CheckCircle2,
  Wallet,
  Filter,
} from "lucide-react";
import { useAuth } from "@/lib/userContext";
import {
  editReceiverAmountInGroup,
  loadSpecifiedGroup,
  removeReceiverDataFromGroup,
} from "@/app/api/api";
import { GroupOfUser, ReceiverInGroup } from "@/types/receiverInGroupTemplate";
import CreateStreamModal from "./sender/CreateStreamModal";
import { Trash2, Edit, RotateCcw, X } from "lucide-react";

interface Stream {
  _id: string;
  token: string;
  tokenIcon: string;
  recipient: string;
  fullname?: string;
  totalAmount: number;
  totalSent: number;
}

interface SenderDashboardProps {
  groupId: string;
  onDropdownOpen?: () => void;
}

export default function SenderDashboard({
  groupId,
  onDropdownOpen,
}: SenderDashboardProps) {
  const { user, loading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");
  const [refreshFlag, setRefreshFlag] = useState(0); // 🔑 trigger ulang useEffect

  const [existingEscrow, setExistingEscrow] = useState<{
    escrowId: string;
    tokenType: "USDC" | "IDRX";
  } | null>(null);

  const [filterType, setFilterType] = useState<"all" | "pending" | "completed">(
    "all",
  );

  useEffect(() => {
    if (loading || !user?._id || hasFetched) return;

    const fetchGroupStreams = async () => {
      try {
        const group: GroupOfUser | null = await loadSpecifiedGroup(
          user._id,
          groupId,
        );

        if (!group) return;

        const mappedStreams: Stream[] = (group.Receivers || []).map(
          (receiver: ReceiverInGroup, i: number) => ({
            _id: receiver._id || `${i}`,
            token:
              typeof receiver.originCurrency === "string"
                ? receiver.originCurrency
                : receiver.originCurrency || "USDC",
            tokenIcon: "💰",
            recipient: receiver.depositWalletAddress || "Unknown",
            fullname: receiver.fullname || "Unknown",
            totalAmount: receiver.amount || 0,
            totalSent: 0,
          }),
        );

        setStreams(mappedStreams);

        // nanti ambil escrowId disini
        if (mappedStreams.length > 0) {
          const firstStream = mappedStreams[0];
          setExistingEscrow({
            escrowId: group.escrowId || "ESCROW_ID",
            tokenType: firstStream.token as "USDC" | "IDRX",
          });
        } else {
          setExistingEscrow(null);
        }

        setHasFetched(true);
      } catch (err) {
        console.error("Failed to fetch specified group streams", err);
      }
    };

    fetchGroupStreams();
  }, [loading, user, hasFetched, groupId, refreshFlag]);
  const handleRefund = async (id: string) => {
    const confirmRefund = window.confirm(
      "Are you sure you want to refund from this person? This action cannot be undone.",
    );
    if (!confirmRefund) return; // user batal, langsung keluar

    // try {
    //   const groupDeleted = await deleteGroup(user._id, groupId);
    //   console.log(groupDeleted);
    //   // Panggil callback setelah sukses delete
    //   if (onGroupDeleted) onGroupDeleted();
    // } catch (err) {
    //   console.log(err);
    //   return;
    // }
  };

  const handleRemove = async (receiverId: string) => {
    const confirmRemove = window.confirm(
      "Are you sure you want to remove this person from the group? This action cannot be undone.",
    );
    if (!confirmRemove) return; // user batal, langsung keluar
    console.log(receiverId);
    try {
      console.log(user);
      const groupDeleted = await removeReceiverDataFromGroup(
        receiverId,
        groupId,
        user._id,
      );
      setStreams((prev) => prev.filter((s) => s._id !== receiverId));
    } catch (err) {
      console.log(err);
      return;
    }
  };
  // Filter streams
  const filteredStreams = streams.filter((s) => {
    const matchesSearch =
      s.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.token.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterType === "all"
        ? true
        : filterType === "pending"
          ? s.totalSent < s.totalAmount
          : filterType === "completed"
            ? s.totalSent >= s.totalAmount
            : true;

    return matchesSearch && matchesFilter;
  });
  const handleSaveAmount = async (receiverId: string, amount: string) => {
    try {
      // update local state dulu
      setStreams((prev) =>
        prev.map((stream) =>
          stream._id === receiverId
            ? { ...stream, totalAmount: parseFloat(editAmount) }
            : stream,
        ),
      );
      console.log(user);
      const amountEdited = await editReceiverAmountInGroup(
        user._id,
        groupId,
        receiverId,
        amount,
      );
      console.log(amountEdited);

      setEditingId(null);
      setEditAmount("");
    } catch (err) {
      console.error("Failed to update amount:", err);
    }
  };

  const totalCommitted = streams.reduce((acc, s) => acc + s.totalAmount, 0);
  const completedCount = streams.filter(
    (s) => s.totalSent >= s.totalAmount,
  ).length;
  const pendingCount = streams.filter(
    (s) => s.totalSent < s.totalAmount,
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">
              Escrow Streams
            </h2>
            <p className="text-white/60">
              Manage escrow streams with smart contract security for automated
              token distribution.
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 flex items-center space-x-2 hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            <span>{existingEscrow ? "Add Receiver" : "Create Escrow"}</span>
          </button>
        </div>

        {existingEscrow && (
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">
                {existingEscrow.tokenType === "USDC" ? "💵" : "🔗"}
              </div>
              <div>
                <p className="text-cyan-300 font-medium">
                  Active Escrow: {existingEscrow.tokenType}
                </p>
                <p className="text-cyan-400/80 text-sm">
                  ID: {existingEscrow.escrowId}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center space-x-3">
              <Clock className="w-8 h-8 text-yellow-400" />
              <div>
                <div className="text-2xl font-bold text-white">
                  {pendingCount}
                </div>
                <div className="text-white/60 text-sm">Pending Streams</div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
              <div>
                <div className="text-2xl font-bold text-white">
                  {completedCount}
                </div>
                <div className="text-white/60 text-sm">Completed</div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center space-x-3">
              <Wallet className="w-8 h-8 text-cyan-400" />
              <div>
                <div className="text-2xl font-bold text-white">
                  {totalCommitted.toLocaleString()}
                </div>
                <div className="text-white/60 text-sm">Total Committed</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
            <input
              type="text"
              placeholder="Search streams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={onDropdownOpen}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-white/60" />
            <select
              value={filterType}
              onChange={(e) =>
                setFilterType(e.target.value as "all" | "pending" | "completed")
              }
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              <option value="all">All Streams</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Streams List (Mobile Cards) */}
        <div className="lg:hidden space-y-4">
          {filteredStreams.map((s) => (
            <div
              key={s._id}
              className="bg-white/5 rounded-xl p-4 border border-white/10"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-white font-medium">{s.recipient}</div>
                  <div className="text-white font-medium">{s.fullname}</div>
                  <div className="text-white/60 text-sm">{s.token}</div>
                </div>
              </div>

              <div className="text-white text-sm mb-3">
                Amount: {s.totalAmount} {s.token}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => handleRefund(s._id)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white flex items-center justify-center rounded-lg aspect-square w-10 h-10"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  {editingId === s._id ? (
                    <>
                      <button
                        onClick={() => handleSaveAmount(s._id, editAmount)}
                        className="bg-green-500 hover:bg-green-600 text-white flex items-center justify-center rounded-lg aspect-square w-10 h-10"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="bg-gray-500 hover:bg-gray-600 text-white flex items-center justify-center rounded-lg aspect-square w-10 h-10"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(s._id);
                          setEditAmount(s.totalAmount.toString());
                        }}
                        className="bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center rounded-lg aspect-square w-10 h-10"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleRemove(s._id)}
                        className="bg-red-500 hover:bg-red-600 text-white flex items-center justify-center rounded-lg aspect-square w-10 h-10"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Streams Table (Desktop) */}
        <div className="hidden lg:block bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left p-4 text-white/80 font-medium">
                    Recipient Address
                  </th>
                  <th className="text-left p-4 text-white/80 font-medium">
                    Recipient Name
                  </th>
                  <th className="text-left p-4 text-white/80 font-medium">
                    Token
                  </th>
                  <th className="text-left p-4 text-white/80 font-medium">
                    Amount
                  </th>
                  <th className="text-left p-4 text-white/80 font-medium">
                    Refund
                  </th>
                  <th className="text-left p-4 text-white/80 font-medium">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStreams.map((s) => (
                  <tr
                    key={s._id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="p-4 text-white">{s.recipient}</td>
                    <td className="p-4 text-white">{s.fullname}</td>
                    <td className="p-4 text-white">{s.token}</td>
                    <td className="p-4 text-white">
                      {editingId === s._id ? (
                        <input
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white w-24"
                        />
                      ) : (
                        s.totalAmount
                      )}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleRefund(s._id)} // panggil fungsi refund
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-lg aspect-square text-sm font-medium transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" /> {/* Refund */}
                      </button>
                    </td>
                    <td className="p-4 flex items-center gap-2">
                      {editingId === s._id ? (
                        <>
                          <button
                            onClick={() => handleSaveAmount(s._id, editAmount)}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg aspect-square text-sm font-medium"
                          >
                            <Edit className="w-4 h-4" /> {/* Edit */}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-lg aspect-square text-sm font-medium"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingId(s._id);
                              setEditAmount(s.totalAmount.toString());
                            }}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 aspect-square rounded-lg text-sm font-medium"
                          >
                            <Edit className="w-4 h-4" /> {/* Edit */}
                          </button>
                          <button
                            onClick={() => handleRemove(s._id)} // panggil fungsi refund
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg aspect-square text-sm font-medium transition-colors"
                          >
                            <Trash2 className="w-4 h-4" /> {/* Remove */}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Empty State */}
        {filteredStreams.length === 0 && (
          <div className="bg-white/5 rounded-2xl border border-white/10 p-12 text-center">
            <div className="text-white/60 mb-2">No streams found</div>
            <div className="text-white/40 text-sm">
              {searchTerm
                ? `No results for "${searchTerm}"`
                : "No streams available in this group"}
            </div>
          </div>
        )}
      </div>

      {/* Create Stream Modal */}
      <CreateStreamModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        existingEscrow={existingEscrow || undefined}
        onCreateStream={(newReceiver) => {
          const mapped: Stream = {
            _id: newReceiver._id,
            token:
              typeof newReceiver.originCurrency === "string"
                ? newReceiver.originCurrency
                : newReceiver.originCurrency,
            tokenIcon: newReceiver.tokenIcon || "💰",
            recipient: newReceiver.depositWalletAddress,
            fullname: newReceiver.fullname,
            totalAmount: newReceiver.amount,
            totalSent: 0,
          };
          setStreams((prev) => [mapped, ...prev]);
        }}
      />
    </div>
  );
}
