"use client";

import { useEffect, useState } from "react";
import { Search, DollarSign, Wallet, CheckCircle2, Clock, Filter } from "lucide-react";
import ClaimModal from "./receiver/ClaimModal";
import { useAuth } from "@/lib/userContext";
import { loadAllWithdrawHistory } from "@/app/api/api";
import { WithdrawHistory } from "@/types/historyTemplate";

interface ReceiverDashboardProps {
  onDropdownOpen?: () => void;
}

export default function ReceiverDashboard({ onDropdownOpen }: ReceiverDashboardProps) {
  const { user, loading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWithdraws, setSelectedWithdraws] = useState<string[]>([]);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [withdrawHistory, setWithdrawHistory] = useState<WithdrawHistory[]>([]);
  const [filterType, setFilterType] = useState<"all" | "pending" | "completed">("all");

  useEffect(() => {
    if (loading || !user?._id || hasFetched) return;

    const fetchWithdrawHistory = async () => {
      try {
        const historyTemplate = await loadAllWithdrawHistory(user._id);
        if (!historyTemplate || !Array.isArray(historyTemplate)) {
          console.warn("Withdraw history not found or not an array.");
          setWithdrawHistory([]); // fallback empty array
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
          })
        );
        setWithdrawHistory(templatesWithdrawHistory);
        setHasFetched(true);
      } catch (err) {
        console.error("Failed to fetch withdraw history", err);
      }
    };

    fetchWithdrawHistory();
  }, [loading, user, hasFetched]);

  // Filter by search and type
  const filteredWithdraws = withdrawHistory.filter((w) => {
    const matchesSearch = 
      w.bankName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.choice?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.originCurrency?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.bankAccountNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = 
      filterType === "all" ? true :
      filterType === "pending" ? !w.withdrawId :
      filterType === "completed" ? w.withdrawId : true;

    return matchesSearch && matchesFilter;
  });

  const handleSelectWithdraw = (withdrawId: string) => {
    setSelectedWithdraws((prev) =>
      prev.includes(withdrawId)
        ? prev.filter((id) => id !== withdrawId)
        : [...prev, withdrawId]
    );
  };

  const handleSelectAll = () => {
    const selectableWithdraws = filteredWithdraws
      .filter((w) => !w.withdrawId)
      .map((w) => w.withdrawId ?? "");

    if (selectedWithdraws.length === selectableWithdraws.length && selectableWithdraws.length > 0) {
      setSelectedWithdraws([]);
    } else {
      setSelectedWithdraws(selectableWithdraws);
    }
  };

  const totalSelectedAmount = filteredWithdraws
    .filter((w) => !w.withdrawId && selectedWithdraws.includes(w.withdrawId ?? ""))
    .reduce((acc, w) => acc + Number(w.amount), 0);

  const selectedWithdrawsData = filteredWithdraws.filter((w) => 
    selectedWithdraws.includes(w.withdrawId ?? "")
  );

  const handleClaim = () => {
    if (selectedWithdraws.length > 0) {
      setShowClaimModal(true);
    }
  };

  const pendingCount = withdrawHistory.filter(w => !w.withdrawId).length;
  const completedCount = withdrawHistory.filter(w => w.withdrawId).length;

  // Calculate total amount safely
  const totalAmount = withdrawHistory.reduce((acc, w) => acc + Number(w.amount), 0);
  const formattedTotalAmount = typeof totalAmount === 'number' && !isNaN(totalAmount) 
    ? totalAmount.toFixed(2) 
    : '0.00';

  // Format total selected amount safely
  const formattedSelectedAmount = typeof totalSelectedAmount === 'number' && !isNaN(totalSelectedAmount) 
    ? totalSelectedAmount.toFixed(4) 
    : '0.0000';

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">
              Withdraw History
            </h2>
            <p className="text-white/60">
              Manage your withdraw requests and claim your tokens.
            </p>
          </div>

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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center space-x-3">
              <Clock className="w-8 h-8 text-yellow-400" />
              <div>
                <div className="text-2xl font-bold text-white">{pendingCount}</div>
                <div className="text-white/60 text-sm">Pending Claims</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
              <div>
                <div className="text-2xl font-bold text-white">{completedCount}</div>
                <div className="text-white/60 text-sm">Completed</div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center space-x-3">
              <Wallet className="w-8 h-8 text-cyan-400" />
              <div>
                <div className="text-2xl font-bold text-white">
                  {formattedTotalAmount}
                </div>
                <div className="text-white/60 text-sm">Total USDC</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by bank, token, or account..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={onDropdownOpen}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-white/60" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as "all" | "pending" | "completed")}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              <option value="all">All Withdraws</option>
              <option value="pending">Pending Claims</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Mobile Cards View */}
        <div className="lg:hidden space-y-4">
          {filteredWithdraws.map((w) => (
            <div key={w.withdrawId} className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {!w.withdrawId && (
                    <input
                      type="checkbox"
                      checked={selectedWithdraws.includes(w.withdrawId ?? "")}
                      onChange={() => handleSelectWithdraw(w.withdrawId ?? "")}
                      className="w-4 h-4"
                    />
                  )}
                  <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">U</span>
                  </div>
                  <div>
                    <div className="text-white font-medium">{w.originCurrency}</div>
                    <div className="text-white/60 text-sm">{w.amount} USDC</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {w.withdrawId ? (
                    <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-lg text-xs">
                      Completed
                    </span>
                  ) : (
                    <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-lg text-xs">
                      Pending
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-white/60">Type</div>
                  <div className="text-white">{w.choice || "Crypto"}</div>
                </div>
                <div>
                  <div className="text-white/60">Destination</div>
                  <div className="text-white font-mono text-xs">
                    {w.bankName || w.networkChainId || "Wallet"}
                  </div>
                </div>
              </div>

              {!w.withdrawId && (
                <button
                  onClick={() => {
                    setSelectedWithdraws([w.withdrawId ?? ""]);
                    setShowClaimModal(true);
                  }}
                  className="w-full mt-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                >
                  Claim Now
                </button>
              )}
            </div>
          ))}
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
                        filteredWithdraws.filter(w => !w.withdrawId).length > 0 &&
                        selectedWithdraws.length === filteredWithdraws.filter(w => !w.withdrawId).length
                      }
                      onChange={handleSelectAll}
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="text-left p-4 text-white/80 font-medium">Token</th>
                  <th className="text-left p-4 text-white/80 font-medium">Amount</th>
                  <th className="text-left p-4 text-white/80 font-medium">Type</th>
                  <th className="text-left p-4 text-white/80 font-medium">Destination</th>
                  <th className="text-left p-4 text-white/80 font-medium">Status</th>
                  <th className="text-left p-4 text-white/80 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWithdraws.map((w) => (
                  <tr key={w.withdrawId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      {!w.withdrawId ? (
                        <input
                          type="checkbox"
                          checked={selectedWithdraws.includes(w.withdrawId ?? "")}
                          onChange={() => handleSelectWithdraw(w.withdrawId ?? "")}
                          className="w-4 h-4"
                        />
                      ) : (
                        <span className="text-white/40 text-sm">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">U</span>
                        </div>
                        <span className="text-white font-medium">{w.originCurrency}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-white font-medium">{w.amount}</div>
                      <div className="text-white/60 text-xs">USDC</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        {w.choice === "fiat" || w.bankName ? (
                          <>
                            <DollarSign className="w-4 h-4 text-green-400" />
                            <span className="text-white">Fiat</span>
                          </>
                        ) : (
                          <>
                            <Wallet className="w-4 h-4 text-cyan-400" />
                            <span className="text-white">Crypto</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-white text-sm">
                        {w.bankName || w.networkChainId || "Connected Wallet"}
                      </div>
                      <div className="text-white/60 text-xs font-mono">
                        {w.bankAccountNumber || w.walletAddress || "-"}
                      </div>
                    </td>
                    <td className="p-4">
                      {w.withdrawId ? (
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                          <span className="text-green-400 text-sm">Completed</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-yellow-400" />
                          <span className="text-yellow-400 text-sm">Pending</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {!w.withdrawId ? (
                        <button
                          onClick={() => {
                            setSelectedWithdraws([w.withdrawId ?? ""]);
                            setShowClaimModal(true);
                          }}
                          className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all hover:scale-105"
                        >
                          Claim
                        </button>
                      ) : (
                        <span className="text-white/40 text-sm">
                          Completed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Empty State */}
        {filteredWithdraws.length === 0 && (
          <div className="bg-white/5 rounded-2xl border border-white/10 p-12 text-center">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-white/40" />
            </div>
            <div className="text-white/60 mb-2">No withdraws found</div>
            <div className="text-white/40 text-sm">
              {searchTerm ? `No results for "${searchTerm}"` : "No withdraw history available"}
            </div>
          </div>
        )}

        {/* Bulk Actions Bar */}
        {selectedWithdraws.length > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4 shadow-2xl">
            <div className="flex items-center space-x-4">
              <div className="text-white">
                <span className="font-medium">{selectedWithdraws.length}</span>
                <span className="text-white/60 ml-1">selected</span>
              </div>
              <div className="text-white">
                <span className="font-medium">{formattedSelectedAmount}</span>
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
            setSelectedWithdraws([]);
          }}
          selectedStreams={selectedWithdrawsData}
          totalAmount={totalSelectedAmount}
        />
      )}
    </div>
  );
}