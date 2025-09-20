"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  DollarSign,
  TrendingUp,
  Search,
  RefreshCw,
  Plus,
  Clock,
  CheckCircle2,
  Wallet,
  Filter,
  ArrowLeft,
  MoreHorizontal,
} from "lucide-react";
import { useAuth } from "@/lib/userContext";
import {
  clearCacheOnEscrowCreated,
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
import { useWalletClientHook } from "@/lib/useWalletClient";
import {
  removeRecipient,
  escrowContract,
  escrowIdrxContract,
  formatTokenAmount,
  TokenType,
} from "@/lib/smartContract";
import { getTokenAddress, getEscrowAddress } from "@/lib/contractConfig";
interface Stream {
  _id: string;
  token: string;
  tokenIcon: string;
  recipient: string;
  fullname?: string;
  totalAmount: number;
  totalSent: number;
}

interface ContractDetails {
  escrowId: string;
  tokenType: TokenType;
  escrowRoom: {
    sender: string;
    totalAllocatedAmount: bigint;
    totalDepositedAmount: bigint;
    totalWithdrawnAmount: bigint;
    availableBalance: bigint;
    isActive: boolean;
    createdAt: bigint;
    lastTopUpAt: bigint;
    activeReceiverCount: number;
  };
  receivers: Array<{
    receiverAddress: string;
    currentAllocation: bigint;
    withdrawnAmount: bigint;
    isActive: boolean;
  }>;
  totalReceivers: number;
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
  const walletClient = useWalletClientHook();
  const [escrowDetails, setEscrowDetails] = useState<any>(null);
  const [contractDetails, setContractDetails] =
    useState<ContractDetails | null>(null);
  const [detectedTokenType, setDetectedTokenType] = useState<TokenType>("USDC");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");
  const [refreshFlag, setRefreshFlag] = useState(0); // 🔑 trigger ulang useEffect
  const [removingReceiverId, setRemovingReceiverId] = useState<string | null>(
    null,
  ); // New state for tracking removal
  const [isLoadingContractDetails, setIsLoadingContractDetails] =
    useState(false);

  const [existingEscrow, setExistingEscrow] = useState<{
    escrowId: string;
    tokenType: "USDC" | "IDRX";
  } | null>(null);

  const [filterType, setFilterType] = useState<"all" | "pending" | "completed">(
    "all",
  );

  const detectTokenType = (contractAddress: string): TokenType => {
    const lowerAddress = contractAddress.toLowerCase();

    // Get all contract addresses for comparison
    const usdcAddress = getTokenAddress("USDC")?.toLowerCase();
    const usdtAddress = getTokenAddress("USDT")?.toLowerCase();
    const idrxBaseAddress = getTokenAddress("IDRX_BASE")?.toLowerCase();
    const idrxKaiaAddress = getTokenAddress("IDRX_KAIA")?.toLowerCase();

    if (lowerAddress === usdcAddress) return "USDC";
    if (lowerAddress === usdtAddress) return "USDT";
    if (lowerAddress === idrxBaseAddress) return "IDRX_BASE";
    if (lowerAddress === idrxKaiaAddress) return "IDRX_KAIA";

    // Fallback detection based on escrow contract
    const escrowIdrxBaseAddress = getEscrowAddress("IDRX_BASE")?.toLowerCase();
    const escrowIdrxKaiaAddress = getEscrowAddress("IDRX_KAIA")?.toLowerCase();

    if (lowerAddress === escrowIdrxBaseAddress) return "IDRX_BASE";
    if (lowerAddress === escrowIdrxKaiaAddress) return "IDRX_KAIA";

    console.warn("Unknown token type for address:", contractAddress);
    return "USDC"; // Default fallback
  };

  const loadContractDetails = async (
    escrowId: string,
    tokenType: TokenType,
  ) => {
    if (isLoadingContractDetails) return;

    setIsLoadingContractDetails(true);

    let contract;
    if (tokenType === "USDC" || tokenType === "USDT") {
      contract = escrowContract;
    } else if (tokenType === "IDRX_BASE" || tokenType === "IDRX_KAIA") {
      contract = escrowIdrxContract;
    }

    if (!contract) {
      console.error("❌ Contract not found for token type:", tokenType);
      setIsLoadingContractDetails(false);
      return;
    }

    // Format escrow ID properly as bytes32
    let formattedEscrowId = escrowId;
    if (!escrowId.startsWith("0x")) {
      formattedEscrowId = "0x" + escrowId;
    }

    if (formattedEscrowId.length < 66) {
      formattedEscrowId = formattedEscrowId.padEnd(66, "0");
    }

    console.log("🔍 Loading contract details for:", {
      escrowId,
      tokenType,
      contractAddress: contract.address,
      formattedEscrowId,
    });

    try {
      // Get escrow details
      const escrowDetailsResult = await contract.read.getEscrowDetails([
        formattedEscrowId as `0x${string}`,
      ]);

      console.log("✅ Escrow details from contract:", escrowDetailsResult);

      // Get receiver addresses
      const receiverAddresses = await contract.read.getEscrowReceivers([
        formattedEscrowId as `0x${string}`,
      ]);

      console.log("✅ Receiver addresses:", receiverAddresses);

      // Get receiver details for each address
      const receivers = [];
      for (const receiverAddress of receiverAddresses) {
        try {
          const receiverDetails = await contract.read.getReceiverDetails([
            formattedEscrowId as `0x${string}`,
            receiverAddress,
          ]);
          receivers.push({
            receiverAddress,
            currentAllocation: receiverDetails[0],
            withdrawnAmount: receiverDetails[1],
            isActive: receiverDetails[2],
          });
        } catch (receiverError) {
          console.warn(
            "Failed to get details for receiver:",
            receiverAddress,
            receiverError,
          );
        }
      }

      const details: ContractDetails = {
        escrowId,
        tokenType,
        escrowRoom: {
          sender: escrowDetailsResult[0],
          totalAllocatedAmount: escrowDetailsResult[2],
          totalDepositedAmount: escrowDetailsResult[3],
          totalWithdrawnAmount: escrowDetailsResult[4],
          availableBalance: escrowDetailsResult[5],
          isActive: true,
          createdAt: escrowDetailsResult[6],
          lastTopUpAt: escrowDetailsResult[7],
          activeReceiverCount: Number(escrowDetailsResult[9]),
        },
        receivers,
        totalReceivers: receivers.length,
      };

      console.log("✅ Processed contract details:", details);
      setContractDetails(details);

      // Transform contract receivers to streams format (sama seperti di EscrowList)
      const transformedStreams: Stream[] = receivers.map((receiver, index) => {
        const decimals =
          tokenType === "IDRX_BASE" || tokenType === "IDRX_KAIA" ? 2 : 6;
        const allocation =
          Number(receiver.currentAllocation) / Math.pow(10, decimals);
        const withdrawn =
          Number(receiver.withdrawnAmount) / Math.pow(10, decimals);

        return {
          _id: `${escrowId}-${receiver.receiverAddress}`, // Use address as unique ID
          token: tokenType,
          tokenIcon: getTokenIcon(tokenType),
          recipient: receiver.receiverAddress,
          fullname: `${receiver.receiverAddress.slice(0, 6)}...${receiver.receiverAddress.slice(-4)}`,
          totalAmount: allocation,
          totalSent: withdrawn,
        };
      });

      setStreams(transformedStreams);
      console.log("✅ Transformed streams from contract:", transformedStreams);
    } catch (error) {
      console.error("❌ Failed to load contract details:", error);
    } finally {
      setIsLoadingContractDetails(false);
    }
  };
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
        let detectedType: TokenType = "USDC";

        if (details.tokenAddress) {
          detectedType = detectTokenType(details.tokenAddress);
        } else if (details.contractAddress) {
          detectedType = detectTokenType(details.contractAddress);
        }
        setDetectedTokenType(detectedType);

        // Transform contract data to stream format
        await loadContractDetails(groupId, detectedType);
      } catch (err) {
        console.error("❌ Failed to fetch escrow data:", err);
        setEscrowDetails(null); 
        await loadContractDetails(groupId, detectedTokenType); // fallback ke USDC biar ada data
      }
    };

    fetchEscrowData();
  }, [groupId, refreshFlag, loading]);

  // Function to refresh streams data
  // const refreshStreams = async () => {
  //   if (!user?._id) return;

  //   try {
  //     console.log("🔄 Refreshing streams data...");
  //     const groupStreams = await loadAllGroup(user._id, "");
  //     console.log("📊 Refreshed streams data:", groupStreams);

  //     if (groupStreams && groupStreams.length > 0) {
  //       const group = groupStreams.find((g: any) => g._id === groupId);
  //       if (group && group.receivers) {
  //         const mappedStreams: Stream[] = group.receivers.map(
  //           (receiver: any) => ({
  //             _id: receiver._id || Date.now().toString(),
  //             token: receiver.originCurrency || "USDC",
  //             tokenIcon: receiver.tokenIcon || "💰",
  //             recipient: receiver.depositWalletAddress || "",
  //             fullname: receiver.fullname || "Unknown",
  //             totalAmount: receiver.amount || 0,
  //             totalSent: 0,
  //           }),
  //         );
  //         setStreams(mappedStreams);
  //       }
  //     }
  //   } catch (err) {
  //     console.error("❌ Failed to refresh streams data", err);
  //   }
  // };
  const refreshStreams = async () => {
    console.log("🔄 Refreshing streams from blockchain...");
    if (detectedTokenType && groupId) {
      await loadContractDetails(groupId, detectedTokenType);
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
      "Are you sure you want to remove this person from the escrow? This action cannot be undone.",
    );
    if (!confirmRemove) return;
    setRemovingReceiverId(receiverId);
    try {
      // if (!user) throw new Error("User not found");
      // const groupDeleted = await removeReceiverDataFromGroup(
      //   receiverId,
      //   groupId,
      //   user._id,
      // );
      if (!walletClient) throw new Error("Wallet client not found");
      const receiverToRemove = streams.find((s) => s._id === receiverId);
      if (!receiverToRemove) throw new Error("Receiver not found");
      console.log("Removing receiver:", {
        receiverId,
        recipientAddress: receiverToRemove.recipient,
        escrowId: groupId,
        token: detectedTokenType,
      });

      console.log("Removing receiver...");
      let tokenTypeForContract: "USDC" | "IDRX" | "USDT";
      if (
        detectedTokenType === "IDRX_BASE" ||
        detectedTokenType === "IDRX_KAIA"
      ) {
        tokenTypeForContract = "IDRX";
      } else {
        tokenTypeForContract = detectedTokenType as "USDC" | "USDT";
      }
      const onchailResult = await removeRecipient(
        walletClient,
        detectedTokenType,
        groupId,
        receiverToRemove.recipient as `0x${string}`,
      );

      if (!onchailResult.success)
        throw new Error("Failed to remove recipient on-chain");
      console.log("Receiver removed on-chain:", onchailResult);

      // remove from database
      // console.log("Receiver removed from DB:", receiverId);
      // const databaseResulit = await removeReceiverDataFromGroup(
      //   receiverId,
      //   groupId,
      //   user?._id || "",
      // );
      // console.log("Receiver removed from DB");
      await refreshStreams();
      // setStreams((prev) => prev.filter((s) => s._id !== receiverId));
      setRefreshFlag((prev) => prev + 1);
      clearCacheOnEscrowCreated(user?.walletAddress || "");
    } catch (err) {
      console.error("Error removing receiver:", err);
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

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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

        {(escrowDetails || contractDetails) && (
          <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-xl">{getTokenIcon(detectedTokenType)}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{detectedTokenType} Escrow</h3>
                  <p className="text-cyan-400/80 text-sm">ID: {groupId}</p>
                  <p className="text-white/60 text-sm">
                    Status: {escrowDetails?.isActive || contractDetails ? "Active" : "Completed"}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  {contractDetails ? 
                    formatTokenAmount(
                      contractDetails.escrowRoom.totalAllocatedAmount,
                      (detectedTokenType === "IDRX_BASE" || detectedTokenType === "IDRX_KAIA") ? 2 : 6
                    ) :
                    escrowDetails ? (
                      parseFloat(escrowDetails.totalAmount) /
                      Math.pow(10, (detectedTokenType === "IDRX_BASE" || detectedTokenType === "IDRX_KAIA") ? 2 : 6)
                    ).toFixed((detectedTokenType === "IDRX_BASE" || detectedTokenType === "IDRX_KAIA") ? 0 : 2) :
                    "0"
                  } {detectedTokenType}
                </div>
                <div className="text-white/60 text-sm">Total Allocated</div>
                {contractDetails && (
                  <div className="text-green-400 text-sm">
                    {formatTokenAmount(
                      contractDetails.escrowRoom.availableBalance,
                      (detectedTokenType === "IDRX_BASE" || detectedTokenType === "IDRX_KAIA") ? 2 : 6
                    )} {detectedTokenType} available
                  </div>
                )}
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
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">Receivers</h3>
            {isLoadingContractDetails && (
              <div className="flex items-center space-x-2 text-cyan-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading from blockchain...</span>
              </div>
            )}
          </div>

          {streams.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
              <Users className="w-12 h-12 text-white/40 mx-auto mb-4" />
              <p className="text-white/60 mb-4">
                {isLoadingContractDetails ? "Loading receivers..." : "No receivers found"}
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all"
              >
                Add First Receiver
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredStreams.map((stream) => (
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
                        <p className="text-white/60 text-sm font-mono">{stream.recipient}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <div className="text-lg font-semibold text-white">
                          {stream.totalAmount.toFixed(
                            detectedTokenType === "IDRX_BASE" || detectedTokenType === "IDRX_KAIA" ? 0 : 2,
                          )} {stream.token}
                        </div>
                        <div className="text-sm text-green-400">
                          {stream.totalSent.toFixed(
                            detectedTokenType === "IDRX_BASE" || detectedTokenType === "IDRX_KAIA" ? 0 : 2,
                          )} {stream.token} claimed
                        </div>
                        <div className="text-xs text-white/60">
                          {stream.totalAmount > 0 
                            ? (((stream.totalAmount - stream.totalSent) / stream.totalAmount) * 100).toFixed(1)
                            : "0"
                          }% remaining
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleRemove(stream._id)}
                          disabled={removingReceiverId === stream._id}
                          className={`border border-red-500/30 p-2 rounded-lg transition-all group ${
                            removingReceiverId === stream._id
                              ? "bg-red-500/10 text-red-600 cursor-not-allowed"
                              : "bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300"
                          }`}
                          title="Remove receiver"
                        >
                          {removingReceiverId === stream._id ? (
                            <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          )}
                        </button>
                        
                        <button
                          className="bg-white/10 hover:bg-white/20 border border-white/20 text-white/60 hover:text-white/80 p-2 rounded-lg transition-all"
                          title="More options"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
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
        existingEscrow={
          escrowDetails
            ? {
                escrowId: groupId,
                tokenType: detectedTokenType,
              }
            : undefined
        }
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
