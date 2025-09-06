"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/lib/walletContext";
import { getReceiverEscrows, canReceiverClaim, getWithdrawableAmount } from "@/lib/escrowReader";
import { formatTokenAmount } from "@/lib/smartContract";
import { 
  Wallet, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Gift
} from "lucide-react";

export default function ReceiverEscrowList() {
  const { address, isConnected } = useWallet();
  const [escrows, setEscrows] = useState<unknown[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReceiverEscrows = async () => {
    if (!isConnected || !address) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const allEscrows: any[] = [];
      
      // Check both USDC and IDRX escrows
      const usdcEscrows = await getReceiverEscrows(address, 'USDC');
      const idrxEscrows = await getReceiverEscrows(address, 'IDRX');
      
      // Process USDC escrows
      for (const escrowId of usdcEscrows) {
        const claimStatus = await canReceiverClaim(escrowId, address, 'USDC');
        if (claimStatus.canClaim) {
          const withdrawable = await getWithdrawableAmount(escrowId, address, 'USDC');
          allEscrows.push({
            escrowId,
            tokenType: 'USDC',
            claimableAmount: withdrawable,
            formattedAmount: formatTokenAmount(withdrawable, 6),
            canClaim: claimStatus.canClaim,
            reason: claimStatus.reason
          });
        }
      }
      
      // Process IDRX escrows
      for (const escrowId of idrxEscrows) {
        const claimStatus = await canReceiverClaim(escrowId, address, 'IDRX');
        if (claimStatus.canClaim) {
          const withdrawable = await getWithdrawableAmount(escrowId, address, 'IDRX');
          allEscrows.push({
            escrowId,
            tokenType: 'IDRX',
            claimableAmount: withdrawable,
            formattedAmount: formatTokenAmount(withdrawable, 2),
            canClaim: claimStatus.canClaim,
            reason: claimStatus.reason
          });
        }
      }
      
      setEscrows(allEscrows);
    } catch (err) {
      console.error('Error loading receiver escrows:', err);
      setError('Failed to load escrow information from blockchain');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReceiverEscrows();
  }, [isConnected, address]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
        <div className="flex items-center space-x-3 text-yellow-300">
          <AlertCircle className="w-5 h-5" />
          <span>Connect your wallet to see escrows you can claim from</span>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-center space-x-3">
          <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
          <span className="text-white/60">Loading your claimable escrows...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
        <div className="flex items-center space-x-3 text-red-300">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
        <button
          onClick={loadReceiverEscrows}
          className="mt-3 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 hover:bg-red-500/30 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (escrows.length === 0) {
    return (
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
        <div className="text-center">
          <Gift className="w-12 h-12 text-blue-400 mx-auto mb-3" />
          <h3 className="text-blue-300 text-lg font-medium mb-2">No Claimable Escrows</h3>
          <p className="text-blue-200/80 text-sm">
            You don't have any escrows to claim from at the moment. 
            Escrows will appear here once they are created and funded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-white">Claimable Escrows</h3>
            <p className="text-white/60 text-sm">
              You have {escrows.length} escrow{escrows.length !== 1 ? 's' : ''} with funds available to claim
            </p>
          </div>
          
          <button
            onClick={loadReceiverEscrows}
            className="p-2 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Escrow List */}
      <div className="space-y-4">
        {escrows.map((escrow, index) => (
          <div key={index} className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  escrow.tokenType === 'USDC' ? 'bg-blue-500/20' : 'bg-purple-500/20'
                }`}>
                  <span className="text-lg">{escrow.tokenType === 'USDC' ? '💵' : '🔗'}</span>
                </div>
                <div>
                  <h4 className="text-white font-semibold">{escrow.tokenType} Escrow</h4>
                  <p className="text-white/60 text-sm">ID: {formatAddress(escrow.escrowId)}</p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="flex items-center space-x-2 text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Ready to Claim</span>
                </div>
                <p className="text-white/60 text-sm">Available for withdrawal</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <p className="text-white/60 text-sm">Token Type</p>
                <p className="text-white font-semibold">{escrow.tokenType}</p>
              </div>
              
              <div className="text-center p-3 bg-green-500/10 rounded-lg">
                <p className="text-green-300 text-sm">Claimable Amount</p>
                <p className="text-green-400 font-semibold text-lg">
                  {escrow.formattedAmount} {escrow.tokenType}
                </p>
              </div>
              
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <p className="text-white/60 text-sm">Status</p>
                <p className="text-green-400 font-medium">Active</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <div className="flex items-center space-x-2 text-white/60 text-sm">
                <Wallet className="w-4 h-4" />
                <span>Connected: {formatAddress(address!)}</span>
              </div>
              
              <div className="flex space-x-3">
                <a
                  href={`https://sepolia.basescan.org/address/${escrow.escrowId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white/80 hover:bg-white/20 transition-colors flex items-center space-x-2 text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>View on Explorer</span>
                </a>
                
                <button className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition-all hover:scale-105">
                  Claim Funds
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-xl p-6">
        <div className="text-center">
          <h4 className="text-emerald-300 text-lg font-semibold mb-2">Total Claimable</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-emerald-200/80 text-sm">USDC</p>
              <p className="text-emerald-300 font-semibold text-lg">
                {escrows
                  .filter(e => e.tokenType === 'USDC')
                  .reduce((acc, e) => acc + parseFloat(e.formattedAmount), 0)
                  .toFixed(2)} USDC
              </p>
            </div>
            <div>
              <p className="text-emerald-200/80 text-sm">IDRX</p>
              <p className="text-emerald-300 font-semibold text-lg">
                {escrows
                  .filter(e => e.tokenType === 'IDRX')
                  .reduce((acc, e) => acc + parseFloat(e.formattedAmount), 0)
                  .toFixed(0)} IDRX
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
