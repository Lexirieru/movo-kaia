"use client";

import { useEffect, useState } from "react";
import {
  Search,
  DollarSign,
  Wallet,
  SortDesc,
  Clock,
  SortAsc,
  Users,
} from "lucide-react";
import ClaimModal from "./receiver/ClaimModal";
import { useAuth } from "@/lib/userContext";
import { loadAllIncomingTransaction } from "@/app/api/api";
import { IncomingTransaction } from "@/types/historyTemplate";

interface ReceiverDashboardProps {
  onDropdownOpen?: () => void;
}

type SortOption = "newest" | "oldest" | "highest" | "lowest";

export default function ReceiverDashboard({
  onDropdownOpen,
}: ReceiverDashboardProps) {
  const { user, loading, currentWalletAddress } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>(
    [],
  );
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [incomingTransactions, setIncomingTransactions] = useState<
    IncomingTransaction[]
  >([]);
  const [sortOption, setSortOption] = useState<SortOption>("newest");

  useEffect(() => {
    if (loading || !user?._id || !currentWalletAddress || hasFetched) return;

    const fetchIncomingTransactions = async () => {
      try {
        const response = await loadAllIncomingTransaction(
          user._id,
          currentWalletAddress,
        );

        if (!response || !Array.isArray(response)) {
          console.warn("Incoming transactions not found or not an array.");
          setIncomingTransactions([]);
          setHasFetched(true);
          return;
        }

        // Map response sesuai interface IncomingTransaction
        const mappedTransactions: IncomingTransaction[] = response
          .map((transaction: any) => ({
            receiverWalletAddress:
              transaction.receiverWalletAddress || currentWalletAddress,
            receiverId: transaction.receiverId || user._id,
            totalAmount: transaction.totalAmount?.toString() || "0",
            availableAmount: transaction.availableAmount?.toString() || "0",
            originCurrency: transaction.originCurrency || "USDC",
            senderWalletAddress: transaction.senderWalletAddress || "",
            senderName: transaction.senderName || "Unknown Sender",
            createdAt: transaction.createdAt
              ? new Date(transaction.createdAt)
              : new Date(),
          }))
          .filter((transaction) => parseFloat(transaction.availableAmount) > 0);

        setIncomingTransactions(mappedTransactions);
        setHasFetched(true);
      } catch (err) {
        console.error("Failed to fetch incoming transactions", err);
        setIncomingTransactions([]);
        setHasFetched(true);
      }
    };

    fetchIncomingTransactions();
  }, [loading, user, currentWalletAddress, hasFetched]);

  // Reset hasFetched ketika currentWalletAddress berubah
  useEffect(() => {
    setHasFetched(false);
    setIncomingTransactions([]);
  }, [currentWalletAddress]);

  // Filter transactions berdasarkan search dan filter type
  const sortTransactions = (
    transactions: IncomingTransaction[],
  ): IncomingTransaction[] => {
    const sorted = [...transactions];

    switch (sortOption) {
      case "newest":
        return sorted.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        );
      case "oldest":
        return sorted.sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
        );
      case "highest":
        return sorted.sort(
          (a, b) =>
            parseFloat(b.availableAmount) - parseFloat(a.availableAmount),
        );
      case "lowest":
        return sorted.sort(
          (a, b) =>
            parseFloat(a.availableAmount) - parseFloat(b.availableAmount),
        );
      default:
        return sorted;
    }
  };

  const filteredTransactions = sortTransactions(
    incomingTransactions.filter((transaction) => {
      const matchesSearch =
        transaction.senderName
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        transaction.senderWalletAddress
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        transaction.originCurrency
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      return matchesSearch;
    }),
  );

  const totalAvailableAmount = incomingTransactions.reduce(
    (sum, t) => sum + parseFloat(t.availableAmount),
    0,
  );

  const formattedAvailableAmount = totalAvailableAmount.toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );

  const handleSelectTransaction = (transactionIndex: number) => {
    const transactionKey = `${transactionIndex}`;
    setSelectedTransactions((prev) =>
      prev.includes(transactionKey)
        ? prev.filter((id) => id !== transactionKey)
        : [...prev, transactionKey],
    );
  };

  const handleSelectAll = () => {
    const selectableTransactions = filteredTransactions.map((_, index) =>
      index.toString(),
    );

    if (
      selectedTransactions.length === selectableTransactions.length &&
      selectableTransactions.length > 0
    ) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(selectableTransactions);
    }
  };

  const totalSelectedAmount = selectedTransactions.reduce(
    (acc, transactionKey) => {
      const index = parseInt(transactionKey);
      const transaction = filteredTransactions[index];
      return transaction ? acc + parseFloat(transaction.availableAmount) : acc;
    },
    0,
  );

  const formattedSelectedAmount = totalSelectedAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const selectedTransactionsData = selectedTransactions
    .map((transactionKey) => {
      const index = parseInt(transactionKey);
      return filteredTransactions[index];
    })
    .filter(Boolean);

  const handleClaim = () => {
    if (selectedTransactions.length > 0) {
      setShowClaimModal(true);
    }
  };

  const handleClaimSuccess = () => {
    const remainingTransactions = incomingTransactions.filter((_, index) => {
      return !selectedTransactions.includes(index.toString());
    });
    setIncomingTransactions(remainingTransactions);
    setSelectedTransactions([]);
    setShowClaimModal(false);
  };

  const getSortOptionDisplay = (option: SortOption): string => {
    switch (option) {
      case "newest":
        return "Newest";
      case "oldest":
        return "Oldest";
      case "highest":
        return "Highest Amount";
      case "lowest":
        return "Lowest Amount";
      default:
        return "Newest";
    }
  };

  const getSortIcon = () => {
    if (sortOption === "highest" || sortOption === "newest") {
      return <SortDesc className="w-4 h-4 text-white/60" />;
    }
    return <SortAsc className="w-4 h-4 text-white/60" />;
  };

  if (loading || !hasFetched) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading incoming transactions...</p>
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
            <h2 className="text-3xl font-bold text-white mb-2">
              Available Withdrawals
            </h2>
            <p className="text-white/60">
              Manage your incoming transactions and claim available amounts.
            </p>
          </div>

          {selectedTransactions.length > 0 && (
            <button
              onClick={handleClaim}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg hover:shadow-green-500/25 transition-all duration-300 flex items-center space-x-2 hover:scale-105"
            >
              <DollarSign className="w-5 h-5" />
              <span>Claim Selected ({selectedTransactions.length})</span>
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center space-x-3">
              <Wallet className="w-8 h-8 text-cyan-400" />
              <div>
                <div className="text-2xl font-bold text-white">
                  ${formattedAvailableAmount}
                </div>
                <div className="text-white/60 text-sm">Available to Claim</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center space-x-3">
            <Users className="w-8 h-8 text-purple-400" />
            <div>
              <div className="text-2xl font-bold text-white">
                {
                  new Set(
                    incomingTransactions.map((t) => t.senderWalletAddress),
                  ).size
                }
              </div>
              <div className="text-white/60 text-sm">Unique Senders</div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by sender or currency..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={onDropdownOpen}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
            />
          </div>

          <div className="flex items-center space-x-2">
            {getSortIcon()}
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 appearance-none cursor-pointer min-w-[160px]"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="highest">Highest Amount</option>
              <option value="lowest">Lowest Amount</option>
            </select>
          </div>
        </div>

        {/* Mobile Cards View */}
        <div className="lg:hidden space-y-4">
          {filteredTransactions.map((transaction, index) => {
            return (
              <div
                key={`${transaction.senderWalletAddress}-${index}`}
                className="bg-white/5 rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.includes(index.toString())}
                      onChange={() => handleSelectTransaction(index)}
                      className="w-4 h-4 text-green-600 bg-white/10 border-white/20 rounded focus:ring-green-500 focus:ring-2"
                    />
                    <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">
                        {transaction.originCurrency.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="text-white font-medium">
                        {transaction.senderName}
                      </div>
                      <div className="text-white/60 text-sm">
                        ${parseFloat(transaction.availableAmount).toFixed(2)}{" "}
                        available
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-lg text-xs">
                      Available
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-white/60">Currency</div>
                    <div className="text-white">
                      {transaction.originCurrency}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-white/60">Date</div>
                    <div className="text-white text-sm">
                      {transaction.createdAt.toLocaleDateString()}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-white/60">Sender Address</div>
                    <div className="text-white font-mono text-xs">
                      {transaction.senderWalletAddress.slice(0, 10)}...
                      {transaction.senderWalletAddress.slice(-8)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedTransactions([index.toString()]);
                    setShowClaimModal(true);
                  }}
                  className="w-full mt-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                >
                  Claim ${parseFloat(transaction.availableAmount).toFixed(2)}
                </button>
              </div>
            );
          })}
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left p-4 text-white/80 font-medium w-12">
                    <input
                      type="checkbox"
                      checked={
                        filteredTransactions.length > 0 &&
                        selectedTransactions.length ===
                          filteredTransactions.length
                      }
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-green-600 bg-white/10 border-white/20 rounded focus:ring-green-500 focus:ring-2"
                    />
                  </th>
                  <th className="text-left p-4 text-white/80 font-medium">
                    Sender
                  </th>
                  <th className="text-left p-4 text-white/80 font-medium">
                    Currency
                  </th>
                  <th className="text-left p-4 text-white/80 font-medium">
                    Available
                  </th>
                  <th className="text-left p-4 text-white/80 font-medium">
                    Date
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
                {filteredTransactions.map((transaction, index) => {
                  return (
                    <tr
                      key={`${transaction.senderWalletAddress}-${index}`}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedTransactions.includes(
                            index.toString(),
                          )}
                          onChange={() => handleSelectTransaction(index)}
                          className="w-4 h-4 text-green-600 bg-white/10 border-white/20 rounded focus:ring-green-500 focus:ring-2"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-bold">
                              {transaction.senderName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-white font-medium">
                              {transaction.senderName}
                            </div>
                            <div className="text-white/60 text-xs font-mono">
                              {transaction.senderWalletAddress.slice(0, 10)}...
                              {transaction.senderWalletAddress.slice(-8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-white font-medium">
                          {transaction.originCurrency}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="text-white font-medium">
                          ${parseFloat(transaction.availableAmount).toFixed(2)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-white text-sm">
                          {transaction.createdAt.toLocaleDateString()}
                        </div>
                        <div className="text-white/60 text-xs">
                          {transaction.createdAt.toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-yellow-400" />
                          <span className="text-yellow-400 text-sm">
                            Available
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => {
                            setSelectedTransactions([index.toString()]);
                            setShowClaimModal(true);
                          }}
                          className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all hover:scale-105"
                        >
                          Claim
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Empty State */}
        {filteredTransactions.length === 0 && (
          <div className="bg-white/5 rounded-2xl border border-white/10 p-12 text-center">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-white/40" />
            </div>
            <div className="text-white/60 mb-2">
              {incomingTransactions.length === 0
                ? "No pending transactions"
                : "No transactions found"}
            </div>
            <div className="text-white/40 text-sm">
              {searchTerm
                ? `No results for "${searchTerm}"`
                : incomingTransactions.length === 0
                  ? "You don't have any pending transactions to claim"
                  : "Try adjusting your search or sort criteria"}
            </div>
          </div>
        )}

        {/* Bulk Actions Bar */}
        {selectedTransactions.length > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4 shadow-2xl">
            <div className="flex items-center space-x-4">
              <div className="text-white">
                <span className="font-medium">
                  {selectedTransactions.length}
                </span>
                <span className="text-white/60 ml-1">selected</span>
              </div>
              <div className="text-white">
                <span className="font-medium">${formattedSelectedAmount}</span>
                <span className="text-white/60 ml-1">USDC</span>
              </div>
              <button
                onClick={handleClaim}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-2 rounded-xl font-medium hover:shadow-lg transition-all flex items-center space-x-2 hover:scale-105"
              >
                <DollarSign className="w-4 h-4" />
                <span>Claim All</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Claim Modal */}
      {showClaimModal && (
        <ClaimModal
          isOpen={showClaimModal}
          onClose={() => {
            setShowClaimModal(false);
            setSelectedTransactions([]);
          }}
          selectedStreams={selectedTransactionsData}
          totalAmount={totalSelectedAmount}
        />
      )}
    </div>
  );
}
