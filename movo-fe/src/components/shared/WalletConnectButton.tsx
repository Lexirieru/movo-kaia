"use client";

import { useState } from "react";
import { useWallet } from "@/lib/walletContext";
import { Wallet, LogOut, Copy, Check, AlertCircle } from "lucide-react";

export default function WalletConnectButton() {
  const { isConnected, address, isConnecting, connectWallet, disconnect } = useWallet();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    try {
      setError(null);
      await connectWallet();
    } catch (error: any) {
      console.error("Failed to connect wallet:", error);
      setError(error.message || "Failed to connect wallet. Please try again.");
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
    }
  };

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col space-y-2">
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="flex items-center space-x-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-500/50 text-white rounded-lg transition-colors duration-200"
        >
          <Wallet className="w-4 h-4" />
          <span>{isConnecting ? "Connecting..." : "Connect Wallet"}</span>
        </button>
        
        {error && (
          <div className="flex items-center space-x-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400">{error}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      {/* Wallet Address */}
      <div className="flex items-center space-x-2 px-3 py-2 bg-gray-800 rounded-lg">
        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
        <span className="text-sm text-gray-300 font-mono">
          {formatAddress(address!)}
        </span>
        <button
          onClick={copyAddress}
          className="p-1 hover:bg-gray-700 rounded transition-colors duration-200"
          title="Copy address"
        >
          {copied ? (
            <Check className="w-3 h-3 text-green-400" />
          ) : (
            <Copy className="w-3 h-3 text-gray-400" />
          )}
        </button>
      </div>

      {/* Disconnect Button */}
      <button
        onClick={handleDisconnect}
        className="flex items-center space-x-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors duration-200"
        title="Disconnect wallet"
      >
        <LogOut className="w-4 h-4" />
        <span className="text-sm">Disconnect</span>
      </button>
    </div>
  );
}
