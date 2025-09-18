'use client';

import React from 'react';
import { useWalletConnection } from '@/lib/contexts/WalletContext';

interface WalletStatusProps {
  className?: string;
  showDetails?: boolean;
}

export default function WalletStatus({ className = '', showDetails = false }: WalletStatusProps) {
  const { 
    wallet, 
    isConnecting, 
    isDisconnected, 
    isConnected, 
    address, 
    chainId,
    error 
  } = useWalletConnection();

  const getStatusColor = () => {
    if (isConnecting) return 'text-yellow-600';
    if (isConnected) return 'text-green-600';
    if (error) return 'text-red-600';
    return 'text-gray-600';
  };

  const getStatusText = () => {
    if (isConnecting) return 'Connecting...';
    if (isConnected) return 'Connected';
    if (error) return 'Error';
    return 'Disconnected';
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

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (showDetails) {
    return (
      <div className={`bg-white rounded-lg border p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getWalletIcon()}</span>
            <span className="font-medium text-gray-900">{wallet.type}</span>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            isConnected ? 'bg-green-100 text-green-800' : 
            isConnecting ? 'bg-yellow-100 text-yellow-800' : 
            'bg-gray-100 text-gray-800'
          }`}>
            {getStatusText()}
          </div>
        </div>

        {isConnected && address && (
          <div className="space-y-2">
            <div>
              <span className="text-sm text-gray-500">Address:</span>
              <p className="font-mono text-sm text-gray-900">{formatAddress(address)}</p>
            </div>
            
            {chainId && (
              <div>
                <span className="text-sm text-gray-500">Network:</span>
                <p className="text-sm text-gray-900">{getNetworkName(chainId)}</p>
              </div>
            )}

            {wallet.balance && (
              <div>
                <span className="text-sm text-gray-500">Balance:</span>
                <p className="text-sm text-gray-900">{wallet.balance} ETH</p>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${
        isConnected ? 'bg-green-500' : 
        isConnecting ? 'bg-yellow-500' : 
        'bg-gray-400'
      }`}></div>
      <span className={`text-sm ${getStatusColor()}`}>
        {getStatusText()}
      </span>
      {isConnected && (
        <span className="text-sm text-gray-500">
          {getWalletIcon()} {formatAddress(address || '')}
        </span>
      )}
    </div>
  );
}

// Network indicator component
export function NetworkIndicator({ className = '' }: { className?: string }) {
  const { chainId, isConnected } = useWalletConnection();

  if (!isConnected || !chainId) return null;

  const getNetworkInfo = (chainId: number) => {
    switch (chainId) {
      case 84532:
        return { name: 'Base Sepolia', color: 'bg-blue-500', textColor: 'text-blue-700' };
      case 8453:
        return { name: 'Base Mainnet', color: 'bg-green-500', textColor: 'text-green-700' };
      case 1001:
        return { name: 'Kaia Testnet', color: 'bg-purple-500', textColor: 'text-purple-700' };
      default:
        return { name: 'Unknown', color: 'bg-gray-500', textColor: 'text-gray-700' };
    }
  };

  const network = getNetworkInfo(chainId);

  return (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${network.color} ${className}`}>
      <div className="w-2 h-2 bg-white rounded-full"></div>
      <span className={`text-xs font-medium ${network.textColor}`}>
        {network.name}
      </span>
    </div>
  );
}
