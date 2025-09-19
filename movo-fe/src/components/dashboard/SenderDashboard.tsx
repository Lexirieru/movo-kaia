"use client";

import { useEffect, useState } from "react";
import {
  Users, 
  UserPlus,
  DollarSign, 
  TrendingUp,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  Wallet,
  Filter,
  ArrowLeft
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
import MainLayout from "../layout/MainLayout";
import {
  loadAllGroup,
  getEscrowDetailsWithTokenDetection,
  getEscrowDetails,
} from "@/app/api/api";

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
  const [escrowDetails, setEscrowDetails] = useState<any>(null)
  const [detectedTokenType, setDetectedTokenType] = useState<"USDC" | "USDT" | "IDRX">("USDC");
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
    if (loading || !groupId) return;

    const fetchEscrowData = async () => {
      try {
        console.log("📡 Fetching escrow details for:", groupId);

        // Use the new enhanced function with auto token detection
        const details = await getEscrowDetailsWithTokenDetection(groupId);

        if (!details) {
          throw new Error("Escrow not found");
        }

        setEscrowDetails(details);
        setDetectedTokenType(details.tokenType);

        // Transform contract data to stream format
        if (details.receivers) {
          const transformedStreams: Stream[] = details.receivers.map(
            (receiver: any, index: number) => ({
              _id: `${groupId}-${index}`,
              token: details.tokenType,
              tokenIcon: getTokenIcon(details.tokenType),
              recipient: receiver.address,
              fullname: `${receiver.address.slice(0, 6)}...${receiver.address.slice(-4)}`,
              totalAmount:
                parseFloat(receiver.allocation || "0") /
                Math.pow(10, details.tokenType === "IDRX" ? 2 : 6),
              totalSent:
                parseFloat(receiver.withdrawn || "0") /
                Math.pow(10, details.tokenType === "IDRX" ? 2 : 6),
            }),
          );

          setStreams(transformedStreams);
          console.log("✅ Transformed streams:", transformedStreams);
        }
      } catch (err) {
        console.error("❌ Failed to fetch escrow data:", err);
      }
    };

    fetchEscrowData();
  }, [groupId, refreshFlag, loading]);

  // Function to refresh streams data
  const refreshStreams = async () => {
    if (!user?._id) return;

    try {
      console.log("🔄 Refreshing streams data...");
      const groupStreams = await loadAllGroup(user._id, "");
      console.log("📊 Refreshed streams data:", groupStreams);

      if (groupStreams && groupStreams.length > 0) {
        const group = groupStreams.find((g: any) => g._id === groupId);
        if (group && group.receivers) {
          const mappedStreams: Stream[] = group.receivers.map(
            (receiver: any) => ({
              _id: receiver._id || Date.now().toString(),
              token: receiver.originCurrency || "USDC",
              tokenIcon: receiver.tokenIcon || "💰",
              recipient: receiver.depositWalletAddress || "",
              fullname: receiver.fullname || "Unknown",
              totalAmount: receiver.amount || 0,
              totalSent: 0,
            }),
          );
          setStreams(mappedStreams);
        }
      }
    } catch (err) {
      console.error("❌ Failed to refresh streams data", err);
    }
  };

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

  // Reset hasFetched ketika user berubah (wallet change)
  useEffect(() => {
    if (user?._id) {
      console.log("🔄 User changed, resetting fetch state");
      setHasFetched(false);
      setStreams([]);
    }
  }, [user?._id]);

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
      if (!user) throw new Error("User not found");
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
      if (!user) throw new Error("User not found");
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

  const handleAddReceiver = async (newReceiver: ReceiverInGroup) => {
    console.log("➕ Adding new receiver to escrow:", { groupId, newReceiver });

    // Add to local state immediately for better UX
    const newStream: Stream = {
      _id: newReceiver._id,
      token: newReceiver.originCurrency as string,
      tokenIcon: getTokenIcon(newReceiver.originCurrency),
      recipient: newReceiver.depositWalletAddress,
      fullname:
        newReceiver.fullname ||
        `${newReceiver.depositWalletAddress.slice(0, 6)}...${newReceiver.depositWalletAddress.slice(-4)}`,
      totalAmount: newReceiver.amount,
      totalSent: 0,
    };

    setStreams((prev) => [...prev, newStream]);

    // Trigger refresh to get updated blockchain state
    setRefreshFlag((prev) => prev + 1);
    setIsCreateModalOpen(false);
  };

  const getTokenIcon = (tokenType: string) => {
    switch (tokenType) {
      case "USDT":
        return "💰";
      case "IDRX":
        return "🇮🇩";
      default:
        return "💵"; // USDC
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6 pb-20">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <button
                onClick={() => window.history.back()}
                className="p-2 text-white/60 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Stream Details
                </h2>
                <p className="text-white/60">Manage receivers in this escrow</p>
              </div>
            </div>
          </div>

          {escrowDetails && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all flex items-center space-x-2"
            >
              <UserPlus className="w-5 h-5" />
              <span>Add Receiver</span>
            </button>
          )}
        </div>

        {escrowDetails && (
          <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-xl">
                    {getTokenIcon(detectedTokenType)}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {detectedTokenType} Escrow
                  </h3>
                  <p className="text-cyan-400/80 text-sm">ID: {groupId}</p>
                  <p className="text-white/60 text-sm">
                    Status: {escrowDetails.isActive ? "Active" : "Completed"}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  {(
                    parseFloat(escrowDetails.totalAmount) /
                    Math.pow(10, detectedTokenType === "IDRX" ? 2 : 6)
                  ).toFixed(detectedTokenType === "IDRX" ? 0 : 2)}{" "}
                  {detectedTokenType}
                </div>
                <div className="text-white/60 text-sm">Total Amount</div>
                <div className="text-green-400 text-sm">
                  {(
                    parseFloat(escrowDetails.remainingAmount) /
                    Math.pow(10, detectedTokenType === "IDRX" ? 2 : 6)
                  ).toFixed(detectedTokenType === "IDRX" ? 0 : 2)}{" "}
                  {detectedTokenType} remaining
                </div>
              </div>
            </div>
          </div>
        )}
        {/* {existingEscrow && (
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
        )} */}

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
{/*         
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
        </div> */}

        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-white">Receivers</h3>
          
          {streams.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
              <Users className="w-12 h-12 text-white/40 mx-auto mb-4" />
              <p className="text-white/60 mb-4">No receivers found</p>
              {escrowDetails && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all"
                >
                  Add First Receiver
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {streams.map((stream) => (
                <div
                  key={stream._id}
                  className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-lg">{stream.tokenIcon}</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{stream.fullname}</h4>
                        <p className="text-white/60 text-sm">{stream.recipient}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-semibold text-white">
                        {stream.totalAmount.toFixed(detectedTokenType === "IDRX" ? 0 : 2)} {stream.token}
                      </div>
                      <div className="text-sm text-green-400">
                        {stream.totalSent.toFixed(detectedTokenType === "IDRX" ? 0 : 2)} {stream.token} claimed
                      </div>
                      <div className="text-xs text-white/60">
                        {((stream.totalAmount - stream.totalSent) / stream.totalAmount * 100).toFixed(1)}% remaining
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Streams Table (Desktop) */}
        {/* <div className="hidden lg:block bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
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
                        <RotateCcw className="w-4 h-4" /> 
                      </button>
                    </td>
                    <td className="p-4 flex items-center gap-2">
                      {editingId === s._id ? (
                        <>
                          <button
                            onClick={() => handleSaveAmount(s._id, editAmount)}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg aspect-square text-sm font-medium"
                          >
                            <Edit className="w-4 h-4" /> 
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
                            <Edit className="w-4 h-4" /> 
                          </button>
                          <button
                            onClick={() => handleRemove(s._id)} // panggil fungsi refund
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg aspect-square text-sm font-medium transition-colors"
                          >
                            <Trash2 className="w-4 h-4" /> 
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div> */}

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
existingEscrow={escrowDetails ? {
            escrowId: groupId,
            tokenType: detectedTokenType
          } : undefined}       
        //    onCreateStream={(newReceiver) => {
        //   const mapped: Stream = {
        //     _id: newReceiver._id,
        //     token:
        //       typeof newReceiver.originCurrency === "string"
        //         ? newReceiver.originCurrency
        //         : newReceiver.originCurrency,
        //     tokenIcon: newReceiver.tokenIcon || "💰",
        //     recipient: newReceiver.depositWalletAddress,
        //     fullname: newReceiver.fullname,
        //     totalAmount: newReceiver.amount,
        //     totalSent: 0,
        //   };
        //   setStreams((prev) => [mapped, ...prev]);
        // }}
                  onCreateStream={handleAddReceiver}

        onEscrowCreated={refreshStreams}
      />
    </MainLayout>
  );
}
