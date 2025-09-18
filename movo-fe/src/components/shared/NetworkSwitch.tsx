"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/lib/walletContext";
import { ChevronDown, Check, AlertCircle, Circle, Star } from "lucide-react";

const SUPPORTED_CHAINS = [
  {
    id: 84532, // Base Sepolia
    name: "Base Sepolia",
    shortName: "Base",
    icon: Circle,
    iconColor: "text-blue-400",
  },
  {
    id: 8453, // Base Mainnet
    name: "Base Mainnet",
    shortName: "Base",
    icon: Circle,
    iconColor: "text-blue-500",
  },
  {
    id: 1001, // Kaia Testnet
    name: "Kaia Testnet",
    shortName: "Kaia",
    icon: Star,
    iconColor: "text-green-400",
  },
];

export default function NetworkSwitch() {
  const [isOpen, setIsOpen] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isPending, setIsPending] = useState(false);
  const { isConnected } = useWallet();

  const currentChain = SUPPORTED_CHAINS.find((chain) => chain.id === chainId);

  // Get chain ID from wallet
  useEffect(() => {
    const getChainId = async () => {
      if (!isConnected) {
        setChainId(null);
        return;
      }

      try {
        // Try to get chain ID from window.ethereum
        if (typeof window !== "undefined" && (window as any).ethereum) {
          const chainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
          setChainId(parseInt(chainId, 16));
        }
      } catch (error) {
        console.error("Failed to get chain ID:", error);
        setChainId(null);
      }
    };

    getChainId();
  }, [isConnected]);

  // Don't render if no chain ID is available or wallet not connected
  if (!chainId || !isConnected) {
    return null;
  }

  const handleSwitchChain = async (targetChainId: number) => {
    if (!isConnected) return;
    
    setIsPending(true);
    try {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        await (window as any).ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${targetChainId.toString(16)}` }],
        });
        setChainId(targetChainId);
        setIsOpen(false);
      }
    } catch (error: any) {
      console.error("Failed to switch chain:", error);
      
      // If chain is not added, try to add it
      if (error.code === 4902) {
        try {
          await (window as any).ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${targetChainId.toString(16)}`,
              chainName: SUPPORTED_CHAINS.find(c => c.id === targetChainId)?.name || 'Unknown Chain',
              rpcUrls: [targetChainId === 84532 ? 'https://sepolia.base.org' : 
                        targetChainId === 8453 ? 'https://mainnet.base.org' :
                        'https://testnet.kaia.network'],
              nativeCurrency: {
                name: targetChainId === 1001 ? 'Kaia' : 'Ether',
                symbol: targetChainId === 1001 ? 'KAI' : 'ETH',
                decimals: 18,
              },
              blockExplorerUrls: [targetChainId === 84532 ? 'https://sepolia.basescan.org' :
                                 targetChainId === 8453 ? 'https://basescan.org' :
                                 'https://testnet.kaia.network'],
            }],
          });
          setChainId(targetChainId);
          setIsOpen(false);
        } catch (addError) {
          console.error("Failed to add chain:", addError);
        }
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="flex items-center space-x-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800/50 text-white rounded-lg transition-colors duration-200 border border-gray-600 hover:border-gray-500"
      >
        {isPending ? (
          <div className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin"></div>
        ) : currentChain ? (
          <>
            <currentChain.icon
              className={`w-4 h-4 ${currentChain.iconColor}`}
            />
            <span className="text-sm font-medium">
              {currentChain.shortName}
            </span>
          </>
        ) : (
          <>
            <AlertCircle className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium">Unsupported</span>
          </>
        )}
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50">
          <div className="py-2">
            {SUPPORTED_CHAINS.map((chain) => (
              <button
                key={chain.id}
                onClick={() => handleSwitchChain(chain.id)}
                disabled={isPending || chain.id === chainId}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-700 disabled:bg-gray-800/50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                <div className="flex items-center space-x-3">
                  <chain.icon className={`w-4 h-4 ${chain.iconColor}`} />
                  <div>
                    <div className="text-sm font-medium text-white">
                      {chain.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      Chain ID: {chain.id}
                    </div>
                  </div>
                </div>
                {chain.id === chainId && (
                  <Check className="w-4 h-4 text-green-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
