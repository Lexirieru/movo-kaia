"use client";

import { DollarSign } from "lucide-react";

interface BulkActionsBarProps {
  selectedCount: number;
  totalAmount: number;
  onClaim: () => void;
}

export default function BulkActionsBar({ 
  selectedCount, 
  totalAmount, 
  onClaim 
}: BulkActionsBarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-4 shadow-2xl z-50">
      <div className="flex items-center space-x-4">
        <div className="text-white">
          <span className="font-medium">{selectedCount}</span>
          <span className="text-gray-400 ml-1">selected</span>
        </div>
        <div className="text-white">
          <span className="font-medium">${totalAmount.toFixed(4)}</span>
          <span className="text-gray-400 ml-1">USDC</span>
        </div>
        <button
          onClick={onClaim}
          className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-2 rounded-xl font-medium hover:shadow-lg transition-all flex items-center space-x-2 hover:scale-105"
        >
          <DollarSign className="w-4 h-4" />
          <span>Claim All</span>
        </button>
      </div>
    </div>
  );
}