'use client';

import React, { useState } from 'react';
import { useWalletConnection } from '@/lib/contexts/WalletContext';
import WalletConnectModal from './WalletConnectModal';

interface WalletButtonProps {
  className?: string;
  showBalance?: boolean;
  showNetwork?: boolean;
}

export default function WalletButton({ 
  className = '', 
  showBalance = false, 
  showNetwork = false 
}: WalletButtonProps) {
  const { 
    wallet, 
    isConnecting, 
    isDisconnected, 
    isConnected, 
    address, 
    chainId 
  } = useWalletConnection();
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getNetworkName = (chainId?: number) => {
    switch (chainId) {
      case 84532:
        return 'Base Sepolia';
      case 8453:
        return 'Base Mainnet';
      case 1001:
        return 'Kaia Testnet';
      default:
        return 'Unknown Network';
    }
  };

  const getWalletIcon = () => {
    const icons: Record<string, string> = {
      MetaMask: '🦊',
      WalletConnect: '🔗',
      LINE: '📱',
      OKX: '⭕',
      UNKNOWN: '❓',
    };
    return icons[wallet.type] || icons.UNKNOWN;
  };

  if (isDisconnected) {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          disabled={isConnecting}
          className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
        >
          {isConnecting ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Connecting...</span>
            </div>
          ) : (
            'Connect Wallet'
          )}
        </button>
        
        <WalletConnectModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      </>
    );
  }

  if (isConnected && address) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {/* Wallet Info */}
        <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg">
          <span className="text-lg">{getWalletIcon()}</span>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">
              {formatAddress(address)}
            </span>
            {showNetwork && (
              <span className="text-xs text-gray-500">
                {getNetworkName(chainId)}
              </span>
            )}
          </div>
        </div>

        {/* Balance (if enabled) */}
        {showBalance && wallet.balance && (
          <div className="px-3 py-2 bg-green-100 rounded-lg">
            <span className="text-sm font-medium text-green-800">
              {wallet.balance} ETH
            </span>
          </div>
        )}

        {/* Disconnect Button */}
        <button
          onClick={() => {
            // Add disconnect logic here
            console.log('Disconnect wallet');
          }}
          className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className={`px-4 py-2 text-gray-500 ${className}`}>
      Wallet not connected
    </div>
  );
}

// Compact version for mobile
export function WalletButtonCompact({ className = '' }: { className?: string }) {
  const { isConnected, address, wallet } = useWalletConnection();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 4)}...${addr.slice(-2)}`;
  };

  if (!isConnected) {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className={`px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors ${className}`}
        >
          Connect
        </button>
        
        <WalletConnectModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      </>
    );
  }

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <span className="text-sm">{wallet.type === 'LINE' ? '📱' : '🦊'}</span>
      <span className="text-sm font-medium">{formatAddress(address || '')}</span>
    </div>
  );
}
