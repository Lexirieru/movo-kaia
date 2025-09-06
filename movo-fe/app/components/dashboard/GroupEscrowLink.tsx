"use client";

import { useState, useEffect } from "react";
import {
  Link,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Wallet,
  Hash,
} from "lucide-react";
import { loadSpecifiedGroup } from "@/app/api/api";
import { useAuth } from "@/lib/userContext";

interface GroupEscrowLinkProps {
  groupId: string;
}

export default function GroupEscrowLink({ groupId }: GroupEscrowLinkProps) {
  const { user } = useAuth();

  const [escrowData, setEscrowData] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEscrowData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await loadSpecifiedGroup(user._id, groupId);
      setEscrowData(data);
    } catch (err) {
      console.error("Error loading escrow data:", err);
      setError("Failed to load escrow data from database");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEscrowData();
  }, [groupId]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (isLoading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-center space-x-3">
          <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
          <span className="text-white/60">Loading escrow link...</span>
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
          onClick={loadEscrowData}
          className="mt-3 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 hover:bg-red-500/30 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!escrowData) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
        <div className="flex items-center space-x-3 text-yellow-300">
          <AlertCircle className="w-5 h-5" />
          <span>No escrow found for this group. Create an escrow first.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Group ↔ Escrow Link Header */}
      <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">
            Group ↔ Escrow Link
          </h3>
          <button
            onClick={loadEscrowData}
            className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Group Information */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Hash className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-white/60 text-sm">Group ID (Backend)</p>
                <p className="text-white font-mono text-sm break-all">
                  {groupId}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-white/60 text-sm">Status</p>
                <p className="text-green-400 font-medium">Linked to Escrow</p>
              </div>
            </div>
          </div>

          {/* Escrow Information */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Wallet className="w-5 h-5 text-pink-400" />
              <div>
                <p className="text-white/60 text-sm">Escrow ID (Blockchain)</p>
                <p className="text-white font-mono text-sm break-all">
                  {escrowData.escrowId}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 rounded-full flex items-center justify-center">
                <span className="text-lg">
                  {escrowData.tokenType === "USDC" ? "💵" : "🔗"}
                </span>
              </div>
              <div>
                <p className="text-white/60 text-sm">Token Type</p>
                <p className="text-white font-medium">{escrowData.tokenType}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Link Visualization */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="text-center">
          <h4 className="text-white font-semibold mb-4">Link Visualization</h4>

          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-3">
              <p className="text-purple-300 text-sm font-medium">Backend</p>
              <p className="text-purple-200 text-xs">Group ID</p>
            </div>

            <div className="flex items-center space-x-2">
              <div className="w-8 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
              <Link className="w-5 h-5 text-cyan-400" />
              <div className="w-8 h-1 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"></div>
            </div>

            <div className="bg-pink-500/20 border border-pink-500/30 rounded-lg p-3">
              <p className="text-pink-300 text-sm font-medium">Blockchain</p>
              <p className="text-pink-200 text-xs">Escrow ID</p>
            </div>
          </div>

          <p className="text-white/60 text-sm">
            This group is now linked to an escrow on the blockchain. All escrow
            data can be read directly from the smart contract.
          </p>
        </div>
      </div>

      {/* Escrow Details */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4">
          Escrow Details
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <p className="text-white/60 text-sm">Sender Address</p>
              <p className="text-white font-mono text-sm">
                {formatAddress(escrowData.senderAddress)}
              </p>
            </div>

            <div>
              <p className="text-white/60 text-sm">Total Amount</p>
              <p className="text-white font-semibold">
                {escrowData.totalAmount} {escrowData.tokenType}
              </p>
            </div>

            <div>
              <p className="text-white/60 text-sm">Status</p>
              <p
                className={`font-medium ${escrowData.status === "active" ? "text-green-400" : "text-yellow-400"}`}
              >
                {escrowData.status}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-white/60 text-sm">Transaction Hash</p>
              <p className="text-white font-mono text-sm break-all">
                {formatAddress(escrowData.transactionHash)}
              </p>
            </div>

            <div>
              <p className="text-white/60 text-sm">Created At</p>
              <p className="text-white text-sm">
                {new Date(escrowData.createdAt).toLocaleString()}
              </p>
            </div>

            <div>
              <p className="text-white/60 text-sm">Receivers</p>
              <p className="text-white font-semibold">
                {escrowData.receivers.length} addresses
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Blockchain Explorer Links */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-white">
              Blockchain Verification
            </h4>
            <p className="text-white/60 text-sm">
              Verify escrow data on Base Sepolia Explorer
            </p>
          </div>

          <div className="flex space-x-3">
            <a
              href={`https://sepolia.basescan.org/address/${escrowData.escrowId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-300 hover:bg-cyan-500/30 transition-colors flex items-center space-x-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span>View Escrow</span>
            </a>

            <a
              href={`https://sepolia.basescan.org/tx/${escrowData.transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg text-green-300 hover:bg-green-500/30 transition-colors flex items-center space-x-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span>View Transaction</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
