"use client";

import { Eye } from "lucide-react";

interface ReceiverItemProps {
  receiver: any;
  onViewDetails: (receiver: any) => void;
}

export default function ReceiverItem({ receiver, onViewDetails }: ReceiverItemProps) {
  return (
    <div
      onClick={() => onViewDetails(receiver)}
      className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer"
    >
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
          <span className="text-white font-semibold text-sm">
            {receiver.depositWalletAddress?.slice(2, 4) || '??'}
          </span>
        </div>
        <div>
          <p className="text-white font-medium">
            {receiver.depositWalletAddress?.slice(0, 6)}...{receiver.depositWalletAddress?.slice(-4)}
          </p>
          <p className="text-gray-400 text-sm">
            Wallet Address
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        <div className="text-right">
          <p className="text-green-400 font-semibold">
            ${(receiver.amount || 0).toFixed(2)}
          </p>
          <p className="text-gray-400 text-xs">
            {receiver.originCurrency || 'USDC'}
          </p>
        </div>
        <Eye className="w-5 h-5 text-gray-400" />
      </div>
    </div>
  );
}