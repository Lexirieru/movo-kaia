"use client";

import { useWallet } from "@/lib/walletContext";
import { Wallet } from "lucide-react";
import { useState } from "react";

interface WalletConnectorProps {
  onConnect?: () => void;
  className?: string;
}

export default function WalletConnector({ onConnect, className = "" }: WalletConnectorProps) {
  const { 
    connectWallet,
    isConnected,
    isConnecting,
    address
  } = useWallet();
  
  const [isConnectingLocal, setIsConnectingLocal] = useState(false);

  const handleConnect = async () => {
    try {
      setIsConnectingLocal(true);
      await connectWallet();
      onConnect?.();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsConnectingLocal(false);
    }
  };

  if (isConnected) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Wallet className="w-5 h-5 text-green-400" />
        <span className="text-green-400 font-medium">
          Wallet Connected
        </span>
        {address && (
          <span className="text-gray-400 text-sm">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Wallet Connect Option */}
      <div className="flex justify-center">
        <button
          onClick={handleConnect}
          disabled={isConnecting || isConnectingLocal}
          className={`p-4 rounded-lg border transition-all duration-300 ${
            isConnecting || isConnectingLocal
              ? 'bg-gray-600 border-gray-500 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20 hover:border-blue-400/40 text-white hover:shadow-lg hover:shadow-blue-500/25'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-500/20 rounded-full">
              <Wallet className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold">Connect Wallet</h3>
              <p className="text-sm text-gray-300">Connect to Base Network</p>
            </div>
            {(isConnecting || isConnectingLocal) && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
