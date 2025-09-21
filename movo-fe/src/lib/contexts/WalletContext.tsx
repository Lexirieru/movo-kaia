'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';

export interface WalletContextType {
  // Wallet state
  isConnected: boolean;
  isConnecting: boolean;
  isDisconnected: boolean;
  address?: string;
  chainId?: number;
  error?: string;
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  switchNetwork: (chainId: number) => Promise<void>;
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
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { switchChain: wagmiSwitchChain } = useSwitchChain();

  const connectWallet = async () => {
    try {
      if (connectors.length === 0) {
        throw new Error('No wallet connectors available');
      }
      await connect({ connector: connectors[0] });
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  };

  const disconnectWallet = async () => {
    try {
      await wagmiDisconnect();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      throw error;
    }
  };

  const switchNetworkWallet = async (targetChainId: number) => {
    try {
      await wagmiSwitchChain({ chainId: targetChainId });
    } catch (error) {
      console.error('Failed to switch network:', error);
      throw error;
    }
  };

  const contextValue: WalletContextType = {
    isConnected,
    isConnecting,
    isDisconnected: !isConnected,
    address: address || undefined,
    chainId: chainId || undefined,
    connect: connectWallet,
    disconnect: disconnectWallet,
    switchNetwork: switchNetworkWallet,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

// Hook for wallet connection status (for backward compatibility)
export function useWalletConnection() {
  const { isConnected, isConnecting, isDisconnected, address, chainId } = useWalletContext();
  
  return {
    isConnected,
    isConnecting,
    isDisconnected,
    address,
    chainId,
    wallet: {
      type: 'UNKNOWN' as const,
      isInstalled: true,
      isConnected,
      address,
      chainId,
    },
  };
}
