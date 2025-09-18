"use client";

import { WithdrawHistory } from "@/types/historyTemplate";
import { DollarSign, Wallet, CheckCircle2, Clock } from "lucide-react";

interface TransactionTableProps {
  transactions: WithdrawHistory[];
  selectedWithdraws: string[];
  onSelectWithdraw: (withdrawId: string) => void;
  onSelectAll: () => void;
  onClaim: (transaction: WithdrawHistory) => void;
}

export default function TransactionTable({
  transactions,
  selectedWithdraws,
  onSelectWithdraw,
  onSelectAll,
  onClaim
}: TransactionTableProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const pendingTransactions = transactions.filter((w) => !w.withdrawId);
  const allPendingSelected = pendingTransactions.length > 0 && 
    selectedWithdraws.length === pendingTransactions.length;

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700/50 bg-gray-800/30">
              <th className="text-left p-4 text-gray-300 font-medium w-12">
                <input
                  type="checkbox"
                  checked={allPendingSelected}
                  onChange={onSelectAll}
                  className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                />
              </th>
              <th className="text-left p-4 text-gray-300 font-medium">Transaction</th>
              <th className="text-left p-4 text-gray-300 font-medium">Amount</th>
              <th className="text-left p-4 text-gray-300 font-medium">Type</th>
              <th className="text-left p-4 text-gray-300 font-medium">Destination</th>
              <th className="text-left p-4 text-gray-300 font-medium">Date</th>
              <th className="text-left p-4 text-gray-300 font-medium">Status</th>
              <th className="text-left p-4 text-gray-300 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction, index) => (
              <tr
                key={transaction.withdrawId || index}
                className="border-b border-gray-700/30 hover:bg-gray-800/30 transition-colors"
              >
                <td className="p-4">
                  {!transaction.withdrawId ? (
                    <input
                      type="checkbox"
                      checked={selectedWithdraws.includes(transaction.withdrawId ?? "")}
                      onChange={() => onSelectWithdraw(transaction.withdrawId ?? "")}
                      className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                    />
                  ) : (
                    <span className="text-gray-500 text-sm">-</span>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">
                        {transaction.originCurrency?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div>
                      <div className="text-white font-medium">
                        {transaction.withdrawId ? `${transaction.withdrawId.slice(0, 8)}...` : 'Pending'}
                      </div>
                      <div className="text-gray-400 text-xs">{transaction.originCurrency}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="text-white font-medium">${transaction.amount}</div>
                  <div className="text-gray-400 text-xs">USDC</div>
                </td>
                <td className="p-4">
                  <div className="flex items-center space-x-2">
                    {transaction.choice === "fiat" || transaction.bankName ? (
                      <>
                        <DollarSign className="w-4 h-4 text-green-400" />
                        <span className="text-white">Bank Transfer</span>
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
                    {transaction.bankName || transaction.networkChainId || "Connected Wallet"}
                  </div>
                  <div className="text-gray-400 text-xs font-mono">
                    {transaction.bankAccountNumber || transaction.walletAddress || "-"}
                  </div>
                </td>

                <td className="p-4">
                  {transaction.withdrawId ? (
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
                  {!transaction.withdrawId ? (
                    <button
                      onClick={() => onClaim(transaction)}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all hover:scale-105"
                    >
                      Claim
                    </button>
                  ) : (
                    <span className="text-gray-500 text-sm">Completed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}