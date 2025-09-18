"use client";

import { WithdrawHistory } from "@/types/historyTemplate";
import { DollarSign, Wallet } from "lucide-react";

interface TransactionCardProps {
  transaction: WithdrawHistory;
  isSelected: boolean;
  onSelect: (withdrawId: string) => void;
  onClaim: (transaction: WithdrawHistory) => void;
}

export default function TransactionCard({ 
  transaction, 
  isSelected, 
  onSelect, 
  onClaim 
}: TransactionCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          {!transaction.withdrawId && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelect(transaction.withdrawId ?? "")}
              className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
            />
          )}
          <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">
              {transaction.originCurrency?.charAt(0) || 'U'}
            </span>
          </div>
          <div>
            <div className="text-white font-medium">${transaction.amount}</div>
            <div className="text-gray-400 text-sm">{transaction.originCurrency}</div>
          </div>
        </div>

        <div className="text-right">
          {transaction.withdrawId ? (
            <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-lg text-xs font-medium">
              Completed
            </span>
          ) : (
            <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-lg text-xs font-medium">
              Pending
            </span>
          )}

        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
        <div>
          <div className="text-gray-400">Type</div>
          <div className="text-white">{transaction.choice === 'fiat' ? 'fiat' : 'Crypto'}</div>
        </div>
        <div>
          <div className="text-gray-400">Destination</div>
          <div className="text-white text-xs">
            {transaction.bankName || transaction.networkChainId || 'Wallet'}
          </div>
        </div>
      </div>

      {transaction.withdrawId && (
        <div className="text-xs text-gray-400 font-mono">
          ID: {transaction.withdrawId.slice(0, 8)}...{transaction.withdrawId.slice(-8)}
        </div>
      )}

      {!transaction.withdrawId && (
        <button
          onClick={() => onClaim(transaction)}
          className="w-full mt-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all"
        >
          Claim Now
        </button>
      )}
    </div>
  );
}