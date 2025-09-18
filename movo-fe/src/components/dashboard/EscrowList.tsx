"use client";

import { useState } from "react";
import { 
  Wallet, 
  Users, 
  DollarSign, 
  Clock, 
  ExternalLink,
  MoreVertical,
  Trash2,
  Plus
} from "lucide-react";

interface EscrowData {
  id: string;
  escrowId: string;
  sender: string;
  totalAmount: string;
  createdAt: string;
  receivers: string[];
  amounts: string[];
  tokenAddress: string;
}

interface EscrowListProps {
  escrows: EscrowData[];
  onEscrowSelect: (escrowId: string) => void;
  isLoading: boolean;
  onEscrowDeleted: () => void;
  onTopupFund: (escrowId: string) => void;
}

const formatDate = (timestamp: string) => {
  const date = new Date(parseInt(timestamp) * 1000);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatAmount = (amount: string, tokenAddress: string) => {
  // Check if we have valid data
  if (!amount || amount === "0") {
    return "Amount not available";
  }
  
  // Determine token type based on address
  const usdcAddress = "0xf9D5a610fe990bfCdF7dd9FD64bdfe89D6D1eb4c";
  const usdtAddress = "0x80327544e61e391304ad16f0BAFb2C5c7A76dfB3";
  const idrxAddress = "0x77fEa84656B5EF40BF33e3835A9921dAEAadb976";
  
  let tokenSymbol = "USDC"; // Default to USDC
  let decimals = 6;
  
  if (tokenAddress.toLowerCase() === usdcAddress.toLowerCase()) {
    tokenSymbol = "USDC";
    decimals = 6;
  } else if (tokenAddress.toLowerCase() === usdtAddress.toLowerCase()) {
    tokenSymbol = "USDT";
    decimals = 6;
  } else if (tokenAddress.toLowerCase() === idrxAddress.toLowerCase()) {
    tokenSymbol = "IDRX";
    decimals = 2;
  }
  
  const amountNumber = parseFloat(amount) / Math.pow(10, decimals);
  return `${amountNumber.toFixed(decimals === 6 ? 2 : 0)} ${tokenSymbol}`;
};

export default function EscrowList({
  escrows,
  onEscrowSelect,
  isLoading,
  onEscrowDeleted,
  onTopupFund,
}: EscrowListProps) {
  const [selectedEscrow, setSelectedEscrow] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-white/20 rounded w-32"></div>
                <div className="h-3 bg-white/10 rounded w-24"></div>
              </div>
              <div className="h-8 bg-white/20 rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (escrows.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-8 h-8 text-white/40" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No Escrows Found</h3>
        <p className="text-white/60 mb-6">
          You haven't created any escrows yet. Create your first escrow to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {escrows.map((escrow) => (
        <div
          key={escrow.id}
          className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-200 group"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Escrow #{escrow.escrowId.slice(0, 8)}...
                  </h3>
                  <p className="text-white/60 text-sm">
                    Created {formatDate(escrow.createdAt)}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-white/60" />
                  <span className="text-white/80 text-sm">
                    {escrow.receivers.length} Receivers
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-white/60" />
                  <span className="text-white/80 text-sm">
                    {formatAmount(escrow.totalAmount, escrow.tokenAddress)}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-white/60" />
                  <span className="text-white/80 text-sm">
                    Active
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onEscrowSelect(escrow.escrowId)}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-200 flex items-center space-x-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>View</span>
              </button>
              
              <div className="relative">
                <button
                  onClick={() => setSelectedEscrow(selectedEscrow === escrow.escrowId ? null : escrow.escrowId)}
                  className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                
                {selectedEscrow === escrow.escrowId && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 border border-white/10 rounded-lg shadow-xl z-10">
                    <button
                      onClick={() => {
                        onTopupFund(escrow.escrowId);
                        setSelectedEscrow(null);
                      }}
                      className="w-full px-4 py-3 text-left text-white hover:bg-white/10 flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Top Up Funds</span>
                    </button>
                    <button
                      onClick={() => {
                        onEscrowDeleted();
                        setSelectedEscrow(null);
                      }}
                      className="w-full px-4 py-3 text-left text-red-400 hover:bg-red-500/10 flex items-center space-x-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
