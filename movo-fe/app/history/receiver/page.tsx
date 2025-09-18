"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/userContext";
import {
  loadAllWithdrawHistory,
  saveTokenWithdrawToFiatToDatabase,
} from "@/app/api/api";
import { WithdrawHistory } from "@/types/historyTemplate";
import {
  DollarSign,
  Wallet,
  CheckCircle2,
  Clock,
  Download,
} from "lucide-react";
import PageHeader from "@/app/components/layout/PageHeader";
import LoadingState from "@/app/components/shared/LoadingState";
import EmptyState from "@/app/components/shared/EmptyState";
import StatsCards from "@/app/components/shared/StatsCards";
import SearchFilterBar from "@/app/components/shared/SearchFilterBar";
import TransactionCard from "@/app/components/history/TransactionCard";
import TransactionTable from "@/app/components/history/TransactionTable";
import BulkActionsBar from "@/app/components/history/BulkActionsBar";
import ClaimModal from "@/app/components/dashboard/receiver/ClaimModal";

export default function ReceiverHistoryPage() {
  const { user, loading, currentWalletAddress } = useAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWithdraws, setSelectedWithdraws] = useState<string[]>([]);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [withdrawHistory, setWithdrawHistory] = useState<WithdrawHistory[]>([]);
  const [filterType, setFilterType] = useState<"all" | "pending" | "completed">(
    "all",
  );
  const [dateFilter, setDateFilter] = useState<
    "all" | "week" | "month" | "year"
  >("all");

  // Fetch data
  useEffect(() => {
    if (loading || !user?._id || !currentWalletAddress || hasFetched) return;

    const fetchWithdrawHistory = async () => {
      try {
        // Then fetch the data from database
        const historyTemplate = await loadAllWithdrawHistory(
          user._id,
          currentWalletAddress,
        );

        if (!historyTemplate || !Array.isArray(historyTemplate)) {
          console.warn("Withdraw history not found or not an array.");
          setWithdrawHistory([]);
          setHasFetched(true);
          return;
        }

        const templatesWithdrawHistory: WithdrawHistory[] = historyTemplate.map(
          (w: any) => ({
            withdrawId: w.withdrawId,
            receiverId: w.receiverId,
            amount: w.amount,
            choice: w.choice,
            originCurrency: w.originCurrency,
            targetCurrency: w.targetCurrency ?? "",
            networkChainId: w.networkChainId ?? "",
            walletAddress: w.walletAddress ?? "",
            depositWalletAddress: w.depositWalletAddress ?? "",
            bankId: w.bankId ?? "",
            bankName: w.bankName ?? "",
            bankAccountName: w.bankAccountName ?? "",
            bankAccountNumber: w.bankAccountNumber ?? "",
            createdAt: w.createdAt || new Date().toISOString(),
            claimedAt: w.claimedAt,
            transactionHash: w.transactionHash,
          }),
        );

        console.log(
          "✅ Withdraw history loaded:",
          templatesWithdrawHistory.length,
          "records",
        );
        setWithdrawHistory(templatesWithdrawHistory);
        setHasFetched(true);
      } catch (err) {
        console.error("Failed to fetch withdraw history", err);
        setWithdrawHistory([]);
        setHasFetched(true);
      }
    };

    fetchWithdrawHistory();
  }, [loading, user, currentWalletAddress, hasFetched]);

  // Reset when wallet changes
  useEffect(() => {
    setHasFetched(false);
    setWithdrawHistory([]);
  }, [currentWalletAddress]);

  // Filter transactions
  const filteredWithdraws = withdrawHistory.filter((w) => {
    const matchesSearch =
      w.bankName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.choice?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.originCurrency?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.bankAccountNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.withdrawId?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterType === "all"
        ? true
        : filterType === "pending"
          ? !w.withdrawId
          : filterType === "completed"
            ? w.withdrawId
            : true;

    // const matchesDate = (() => {
    //   if (dateFilter === "all") return true;
    //   //ini kalo mau pake filter tanggal
    //   const itemDate = new Date(w.createdAt || new Date());
    //   const now = new Date();

    //   switch (dateFilter) {
    //     case "week":
    //       return itemDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    //     case "month":
    //       return itemDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    //     case "year":
    //       return itemDate >= new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    //     default:
    //       return true;
    //   }
    // })();

    // return matchesSearch && matchesFilter && matchesDate;
    return matchesSearch && matchesFilter;
  });

  // Handlers
  const handleSelectWithdraw = (withdrawId: string) => {
    setSelectedWithdraws((prev) =>
      prev.includes(withdrawId)
        ? prev.filter((id) => id !== withdrawId)
        : [...prev, withdrawId],
    );
  };

  const handleSelectAll = () => {
    const selectableWithdraws = filteredWithdraws
      .filter((w) => !w.withdrawId)
      .map((w) => w.withdrawId ?? "");

    if (
      selectedWithdraws.length === selectableWithdraws.length &&
      selectableWithdraws.length > 0
    ) {
      setSelectedWithdraws([]);
    } else {
      setSelectedWithdraws(selectableWithdraws);
    }
  };

  const handleClaim = () => {
    if (selectedWithdraws.length > 0) {
      setShowClaimModal(true);
    }
  };

  const handleSingleClaim = (withdraw: WithdrawHistory) => {
    setSelectedWithdraws([withdraw.withdrawId ?? ""]);
    setShowClaimModal(true);
  };

  // Calculate stats
  const pendingCount = withdrawHistory.filter((w) => !w.withdrawId).length;
  const completedCount = withdrawHistory.filter((w) => w.withdrawId).length;
  const totalAmount = withdrawHistory.reduce(
    (acc, w) => acc + Number(w.amount),
    0,
  );
  const pendingAmount = withdrawHistory
    .filter((w) => !w.withdrawId)
    .reduce((acc, w) => acc + Number(w.amount), 0);

  const selectedWithdrawsData = filteredWithdraws.filter((w) =>
    selectedWithdraws.includes(w.withdrawId ?? ""),
  );

  const totalSelectedAmount = selectedWithdrawsData.reduce(
    (acc, w) => acc + Number(w.amount),
    0,
  );

  // Stats data
  const statsData = [
    {
      icon: <Clock className="w-5 h-5 text-yellow-400" />,
      value: pendingCount,
      label: "Pending Claims",
      iconBgColor: "bg-yellow-500/20",
    },
    {
      icon: <CheckCircle2 className="w-5 h-5 text-green-400" />,
      value: completedCount,
      label: "Completed",
      iconBgColor: "bg-green-500/20",
    },
    {
      icon: <Wallet className="w-5 h-5 text-cyan-400" />,
      value: `$${totalAmount.toFixed(2)}`,
      label: "Total Value",
      iconBgColor: "bg-cyan-500/20",
    },
    {
      icon: <DollarSign className="w-5 h-5 text-orange-400" />,
      value: `$${pendingAmount.toFixed(2)}`,
      label: "Pending Value",
      iconBgColor: "bg-orange-500/20",
    },
  ];

  // Filter options
  const statusFilterOptions = [
    { value: "all", label: "All Status" },
    { value: "pending", label: "Pending" },
    { value: "completed", label: "Completed" },
  ];

  const dateFilterOptions = [
    { value: "all", label: "All Time" },
    { value: "week", label: "Last Week" },
    { value: "month", label: "Last Month" },
    { value: "year", label: "Last Year" },
  ];

  // Header right content
  const headerRightContent = (
    <div className="flex items-center space-x-3">
      {selectedWithdraws.length > 0 && (
        <button
          onClick={handleClaim}
          className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg hover:shadow-green-500/25 transition-all duration-300 flex items-center space-x-2 hover:scale-105"
        >
          <DollarSign className="w-5 h-5" />
          <span>Claim Selected ({selectedWithdraws.length})</span>
        </button>
      )}
    </div>
  );

  // Search filter right content
  const searchFilterRightContent = (
    <button className="bg-gray-800/50 hover:bg-gray-800/70 text-white px-4 py-2 rounded-lg border border-gray-700/50 flex items-center space-x-2 transition-colors">
      <Download className="w-4 h-4" />
      <span>Export</span>
    </button>
  );

  if (loading) {
    return <LoadingState message="Loading transaction history..." fullScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Header */}
      <PageHeader
        title="Transaction History"
        subtitle="Your payment claims and withdrawals"
        backPath="/dashboard"
        walletAddress={currentWalletAddress}
        rightContent={headerRightContent}
      />

      {/* Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Action Header */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">
            Your Claims & Withdrawals
          </h2>
          <p className="text-gray-400 text-sm">
            Track and manage your payment history
          </p>
        </div>

        {/* Stats Cards */}
        <StatsCards stats={statsData} columns={4} />

        {/* Search and Filters */}
        <SearchFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search by transaction ID, bank, or amount..."
          statusFilter={{
            value: filterType,
            options: statusFilterOptions,
            onChange: (value: string) =>
              setFilterType(value as "all" | "pending" | "completed"),
          }}
          dateFilter={{
            value: dateFilter,
            options: dateFilterOptions,
            onChange: (value: string) =>
              setDateFilter(value as "all" | "week" | "month" | "year"),
          }}
          rightContent={searchFilterRightContent}
        />

        {/* Empty State */}
        {filteredWithdraws.length === 0 ? (
          <EmptyState
            icon={<DollarSign className="w-8 h-8 text-gray-500" />}
            title="No Transactions Found"
            description={
              searchTerm
                ? `No results for "${searchTerm}"`
                : "No transaction history available"
            }
          />
        ) : (
          <>
            {/* Mobile Cards View */}
            <div className="lg:hidden space-y-4">
              {filteredWithdraws.map((transaction, index) => (
                <TransactionCard
                  key={transaction.withdrawId || index}
                  transaction={transaction}
                  isSelected={selectedWithdraws.includes(
                    transaction.withdrawId ?? "",
                  )}
                  onSelect={handleSelectWithdraw}
                  onClaim={handleSingleClaim}
                />
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block">
              <TransactionTable
                transactions={filteredWithdraws}
                selectedWithdraws={selectedWithdraws}
                onSelectWithdraw={handleSelectWithdraw}
                onSelectAll={handleSelectAll}
                onClaim={handleSingleClaim}
              />
            </div>
          </>
        )}

        {/* Bulk Actions Bar */}
        {selectedWithdraws.length > 0 && (
          <BulkActionsBar
            selectedCount={selectedWithdraws.length}
            totalAmount={totalSelectedAmount}
            onClaim={handleClaim}
          />
        )}
      </div>

      {/* Claim Modal */}
      {showClaimModal && (
        <ClaimModal
          isOpen={showClaimModal}
          onClose={() => {
            setShowClaimModal(false);
            setSelectedWithdraws([]);
          }}
          selectedStreams={selectedWithdrawsData}
          totalAmount={totalSelectedAmount}
        />
      )}
    </div>
  );
}
