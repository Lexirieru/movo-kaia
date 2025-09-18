'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useWallet, useWalletStatus } from '@/hooks';
import { detectWalletType } from '../smartContract';

export interface WalletInfo {
  type: 'MetaMask' | 'WalletConnect' | 'LINE' | 'OKX' | 'UNKNOWN';
  isInstalled: boolean;
  isConnected: boolean;
  address?: string;
  chainId?: number;
  balance?: string;
  error?: string;
}

export interface WalletContextType {
  // Wallet state
  wallet: WalletInfo;
  isConnecting: boolean;
  isDisconnected: boolean;
  
  // Actions
  connect: (walletType?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  switchNetwork: (chainId: number) => Promise<void>;
  refresh: () => void;
  
  // Utility functions
  getWalletIcon: (walletType: string) => string;
  getWalletName: (walletType: string) => string;
  isWalletSupported: (walletType: string) => boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function useWalletContext() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletContext must be used within a WalletProvider');
  }
  return context;
}

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const walletHook = useWallet();
  const walletStatus = useWalletStatus();
  const [walletInfo, setWalletInfo] = useState<WalletInfo>({
    type: 'UNKNOWN',
    isInstalled: false,
    isConnected: false,
  });

  // Detect wallet type and update wallet info
  useEffect(() => {
    const detectWallet = async () => {
      try {
        const walletType = await detectWalletType();
        const isInstalled = walletType !== 'UNKNOWN';
        
        setWalletInfo(prev => ({
          ...prev,
          type: walletType as any,
          isInstalled,
          isConnected: walletStatus.isConnected,
          address: walletStatus.address,
          chainId: walletStatus.chainId,
          error: walletHook.error?.message,
        }));
      } catch (error) {
        console.error('Error detecting wallet:', error);
        setWalletInfo(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    };

    detectWallet();
  }, [walletStatus.isConnected, walletStatus.address, walletStatus.chainId, walletHook.error]);

  const connect = async (walletType?: string) => {
    try {
      if (walletType) {
        // Connect to specific wallet type
        await walletHook.connect(walletType);
      } else {
        // Auto-connect to detected wallet
        await walletHook.connect();
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      setWalletInfo(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Connection failed',
      }));
      throw error;
    }
  };

  const disconnect = async () => {
    try {
      await walletHook.disconnect();
      setWalletInfo(prev => ({
        ...prev,
        isConnected: false,
        address: undefined,
        chainId: undefined,
        error: undefined,
      }));
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      throw error;
    }
  };

  const switchNetwork = async (chainId: number) => {
    try {
      await walletHook.switchChain(chainId);
    } catch (error) {
      console.error('Failed to switch network:', error);
      throw error;
    }
  };

  const refresh = () => {
    walletHook.refresh();
  };

  const getWalletIcon = (walletType: string): string => {
    const icons: Record<string, string> = {
      MetaMask: '🦊',
      WalletConnect: '🔗',
      LINE: '📱',
      OKX: '⭕',
      UNKNOWN: '❓',
    };
    return icons[walletType] || icons.UNKNOWN;
  };

  const getWalletName = (walletType: string): string => {
    const names: Record<string, string> = {
      MetaMask: 'MetaMask',
      WalletConnect: 'WalletConnect',
      LINE: 'LINE Wallet',
      OKX: 'OKX Wallet',
      UNKNOWN: 'Unknown Wallet',
    };
    return names[walletType] || names.UNKNOWN;
  };

  const isWalletSupported = (walletType: string): boolean => {
    const supportedWallets = ['MetaMask', 'WalletConnect', 'LINE', 'OKX'];
    return supportedWallets.includes(walletType);
  };

  const contextValue: WalletContextType = {
    wallet: walletInfo,
    isConnecting: walletHook.isConnecting,
    isDisconnected: walletHook.isDisconnected,
    connect,
    disconnect,
    switchNetwork,
    refresh,
    getWalletIcon,
    getWalletName,
    isWalletSupported,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

// Higher-order component for wallet connection
export function withWallet<P extends object>(
  Component: React.ComponentType<P & { wallet: WalletInfo }>
) {
  return function WrappedComponent(props: P) {
    const { wallet } = useWalletContext();
    return <Component {...props} wallet={wallet} />;
  };
}

// Hook for wallet connection status
export function useWalletConnection() {
  const { wallet, isConnecting, isDisconnected } = useWalletContext();
  
  return {
    wallet,
    isConnecting,
    isDisconnected,
    isConnected: wallet.isConnected,
    hasAddress: !!wallet.address,
    address: wallet.address,
    chainId: wallet.chainId,
    walletType: wallet.type,
    error: wallet.error,
  };
}
