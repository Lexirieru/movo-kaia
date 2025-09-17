"use client";

import { useState } from "react";
import { useSwitchChain, useChainId } from "wagmi";
import { baseSepolia, base, kaia } from "wagmi/chains";
import { ChevronDown, Check, AlertCircle, Circle, Star } from "lucide-react";

const SUPPORTED_CHAINS = [
  {
    id: baseSepolia.id,
    name: "Base Sepolia",
    shortName: "Base",
    icon: Circle,
    iconColor: "text-blue-400",
  },
  {
    id: base.id,
    name: "Base Mainnet",
    shortName: "Base",
    icon: Circle,
    iconColor: "text-blue-500",
  },
  {
    id: kaia.id,
    name: "Kaia Mainnet",
    shortName: "Kaia",
    icon: Star,
    iconColor: "text-green-400",
  },
];

export default function NetworkSwitch() {
  const [isOpen, setIsOpen] = useState(false);
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  const currentChain = SUPPORTED_CHAINS.find((chain) => chain.id === chainId);

  // Don't render if no chain ID is available
  if (!chainId) {
    return null;
  }

  const handleSwitchChain = async (targetChainId: number) => {
    try {
      await switchChain({ chainId: targetChainId });
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to switch chain:", error);
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
