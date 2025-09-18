'use client';

import React, { useState } from 'react';
import { useWalletContext } from '@/lib/contexts/WalletContext';

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WALLET_OPTIONS = [
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: '🦊',
    description: 'Connect using MetaMask browser extension',
    isInstalled: typeof window !== 'undefined' && !!(window as any).ethereum?.isMetaMask,
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    icon: '🔗',
    description: 'Connect using WalletConnect mobile app',
    isInstalled: true,
  },
  {
    id: 'line',
    name: 'LINE Wallet',
    icon: '📱',
    description: 'Connect using LINE Wallet mobile app',
    isInstalled: typeof window !== 'undefined' && !!(window as any).LINE,
  },
  {
    id: 'okx',
    name: 'OKX Wallet',
    icon: '⭕',
    description: 'Connect using OKX Wallet',
    isInstalled: typeof window !== 'undefined' && !!(window as any).okxwallet,
  },
];

export default function WalletConnectModal({ isOpen, onClose }: WalletConnectModalProps) {
  const { connect, isConnecting } = useWalletContext();
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async (walletId: string) => {
    try {
      setError(null);
      setSelectedWallet(walletId);
      await connect(walletId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
      setSelectedWallet(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Connect Wallet</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-3">
            {WALLET_OPTIONS.map((wallet) => (
              <button
                key={wallet.id}
                onClick={() => handleConnect(wallet.id)}
                disabled={isConnecting || selectedWallet === wallet.id}
                className={`w-full p-4 rounded-lg border-2 transition-all duration-200 ${
                  selectedWallet === wallet.id
                    ? 'border-blue-500 bg-blue-50'
                    : wallet.isInstalled
                    ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{wallet.icon}</span>
                  <div className="flex-1 text-left">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{wallet.name}</span>
                      {wallet.isInstalled && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                          Installed
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{wallet.description}</p>
                  </div>
                  {selectedWallet === wallet.id && isConnecting && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              By connecting a wallet, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
