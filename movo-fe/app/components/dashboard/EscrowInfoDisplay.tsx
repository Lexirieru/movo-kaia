"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/lib/walletContext";
import {
  getEscrowDetailsFromContract,
  getEscrowBalanceSummary,
  canReceiverClaim,
  getWithdrawableAmount,
} from "@/lib/escrowReader";
import { formatTokenAmount } from "@/lib/smartContract";
import {
  Wallet,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

interface EscrowInfoDisplayProps {
  escrowId: string;
  tokenType: "USDC" | "IDRX";
}

export default function EscrowInfoDisplay({
  escrowId,
  tokenType,
}: EscrowInfoDisplayProps) {
  const { address, isConnected } = useWallet();
  const [escrowInfo, setEscrowInfo] = useState<unknown>(null);
  const [balanceSummary, setBalanceSummary] = useState<{
    totalAllocated: bigint;
    availableBalance: bigint;
    totalDeposited: bigint;
    totalWithdrawn: bigint;
  } | null>(null);
  const [claimStatus, setClaimStatus] = useState<{
    canClaim: boolean;
    claimableAmount: bigint;
    reason?: string;
  } | null>(null);
  const [withdrawableAmount, setWithdrawableAmount] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEscrowInfo = async () => {
    if (!escrowId || !tokenType) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load escrow details
      const details = await getEscrowDetailsFromContract(escrowId, tokenType);
      if (details) {
        setEscrowInfo(details.toString());
      }

      // Load balance summary
      const balance = await getEscrowBalanceSummary(escrowId, tokenType);
      if (balance) {
        setBalanceSummary(balance);
      }

      // If user is connected, check claim status
      if (isConnected && address) {
        const claimCheck = await canReceiverClaim(escrowId, address, tokenType);
        setClaimStatus(claimCheck);

        if (claimCheck.canClaim) {
          const withdrawable = await getWithdrawableAmount(
            escrowId,
            address,
            tokenType,
          );
          setWithdrawableAmount(
            formatTokenAmount(withdrawable, tokenType === "USDC" ? 6 : 2),
          );
        }
      }
    } catch (err) {
      console.error("Error loading escrow info:", err);
      setError("Failed to load escrow information from blockchain");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEscrowInfo();
  }, [escrowId, tokenType, isConnected, address]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-center space-x-3">
          <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
          <span className="text-white/60">
            Loading escrow information from blockchain...
          </span>
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
          onClick={loadEscrowInfo}
          className="mt-3 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 hover:bg-red-500/30 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!escrowInfo) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
        <div className="flex items-center space-x-3 text-yellow-300">
          <AlertCircle className="w-5 h-5" />
          <span>Escrow information not found on blockchain</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Escrow Overview */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">
            Escrow Information
          </h3>
          <button
            onClick={loadEscrowInfo}
            className="p-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Wallet className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-white/60 text-sm">Sender</p>
                <p className="text-white font-medium">
                  {formatAddress(escrowInfo.escrowRoom.sender)}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-white/60 text-sm">Total Receivers</p>
                <p className="text-white font-medium">
                  {escrowInfo.totalReceivers}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-white/60 text-sm">Created</p>
                <p className="text-white font-medium">
                  {formatTimestamp(escrowInfo.escrowRoom.createdAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <DollarSign className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-white/60 text-sm">Token Type</p>
                <p className="text-white font-medium">{tokenType}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-white/60 text-sm">Status</p>
                <p
                  className={`font-medium ${escrowInfo.escrowRoom.isActive ? "text-green-400" : "text-red-400"}`}
                >
                  {escrowInfo.escrowRoom.isActive ? "Active" : "Inactive"}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <ExternalLink className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-white/60 text-sm">Escrow ID</p>
                <p className="text-white font-mono text-sm">
                  {formatAddress(escrowId)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Balance Information */}
      {balanceSummary && (
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-white mb-4">
            Balance Summary
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-white/60 text-sm">Total Allocated</p>
              <p className="text-white font-semibold">
                {formatTokenAmount(
                  balanceSummary.totalAllocated,
                  tokenType === "USDC" ? 6 : 2,
                )}{" "}
                {tokenType}
              </p>
            </div>

            <div className="text-center">
              <p className="text-white/60 text-sm">Available Balance</p>
              <p className="text-green-400 font-semibold">
                {formatTokenAmount(
                  balanceSummary.availableBalance,
                  tokenType === "USDC" ? 6 : 2,
                )}{" "}
                {tokenType}
              </p>
            </div>

            <div className="text-center">
              <p className="text-white/60 text-sm">Total Deposited</p>
              <p className="text-white font-semibold">
                {formatTokenAmount(
                  balanceSummary.totalDeposited,
                  tokenType === "USDC" ? 6 : 2,
                )}{" "}
                {tokenType}
              </p>
            </div>

            <div className="text-center">
              <p className="text-white/60 text-sm">Total Withdrawn</p>
              <p className="text-white font-semibold">
                {formatTokenAmount(
                  balanceSummary.totalWithdrawn,
                  tokenType === "USDC" ? 6 : 2,
                )}{" "}
                {tokenType}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Receiver List */}
      {escrowInfo.receivers && escrowInfo.receivers.length > 0 && (
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-white mb-4">Receivers</h4>

          <div className="space-y-3">
            {escrowInfo.receivers.map((receiver: unknown, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <span className="text-purple-400 text-sm font-medium">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {formatAddress(receiver.receiverAddress)}
                    </p>
                    <p className="text-white/60 text-sm">
                      {formatTokenAmount(
                        receiver.currentAllocation,
                        tokenType === "USDC" ? 6 : 2,
                      )}{" "}
                      {tokenType}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-white/60 text-sm">Withdrawn</p>
                  <p className="text-white font-medium">
                    {formatTokenAmount(
                      receiver.withdrawnAmount,
                      tokenType === "USDC" ? 6 : 2,
                    )}{" "}
                    {tokenType}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Claim Status for Current User */}
      {isConnected && address && claimStatus && (
        <div
          className={`border rounded-xl p-6 ${
            claimStatus.canClaim
              ? "bg-green-500/10 border-green-500/20"
              : "bg-yellow-500/10 border-yellow-500/20"
          }`}
        >
          <h4 className="text-lg font-semibold text-white mb-4">
            Your Claim Status
          </h4>

          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <CheckCircle
                className={`w-5 h-5 ${claimStatus.canClaim ? "text-green-400" : "text-yellow-400"}`}
              />
              <div>
                <p className="text-white/60 text-sm">Status</p>
                <p
                  className={`font-medium ${claimStatus.canClaim ? "text-green-400" : "text-yellow-400"}`}
                >
                  {claimStatus.canClaim ? "Can Claim" : "Cannot Claim"}
                </p>
              </div>
            </div>

            {claimStatus.canClaim && (
              <div className="flex items-center space-x-3">
                <DollarSign className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-white/60 text-sm">Claimable Amount</p>
                  <p className="text-green-400 font-semibold">
                    {withdrawableAmount} {tokenType}
                  </p>
                </div>
              </div>
            )}

            {!claimStatus.canClaim && claimStatus.reason && (
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                <div>
                  <p className="text-white/60 text-sm">Reason</p>
                  <p className="text-yellow-400">{claimStatus.reason}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Blockchain Explorer Link */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-white">
              Blockchain Information
            </h4>
            <p className="text-white/60 text-sm">
              View this escrow on Base Sepolia Explorer
            </p>
          </div>

          <a
            href={`https://sepolia.basescan.org/address/${escrowId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-300 hover:bg-cyan-500/30 transition-colors flex items-center space-x-2"
          >
            <ExternalLink className="w-4 h-4" />
            <span>View on Explorer</span>
          </a>
        </div>
      </div>
    </div>
  );
}
