'use client';

import { useAccount, useConnect, useDisconnect, useSwitchChain, useBalance } from 'wagmi';
import { kaiaMainnet } from '@/lib/smartContract';

export const useWagmiWallet = () => {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { data: balance, isLoading: isLoadingBalance } = useBalance({
    address: address,
  });

  const connectWallet = async () => {
    try {
      await connect({ connector: connectors[0] });
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  };

  const disconnectWallet = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      throw error;
    }
  };

  const switchNetwork = async (targetChainId: number) => {
    try {
      // Check if the chain is supported
      const supportedChains = [kaiaMainnet];
      const targetChain = supportedChains.find(chain => chain.id === targetChainId);
      if (!targetChain) {
        throw new Error(`Chain with ID ${targetChainId} is not supported`);
      }

      await switchChain({ chainId: targetChainId });
    } catch (error) {
      console.error('Failed to switch network:', error);
      throw error;
    }
  };

  const getCurrentChain = () => {
    if (!chainId) {
      return null;
    }
    
    const supportedChains = [kaiaMainnet];
    const currentChain = supportedChains.find(chain => chain.id === chainId);
    return currentChain ? {
      id: currentChain.id,
      name: currentChain.name,
      logo: `/chain/kaia-logo.svg` // Kaia logo path
    } : null;
  };

  const getBalance = async (): Promise<string> => {
    if (!balance) {
      return '0';
    }
    return balance.formatted;
  };

  return {
    // State
    isConnected,
    account: address,
    currentChainId: chainId,
    isLoading: isSwitching,
    error: null, // wagmi handles errors internally
    
    // Actions
    connect: connectWallet,
    disconnect: disconnectWallet,
    switchNetwork,
    getCurrentChain,
    getBalance,
    
    // Additional wagmi data
    balance,
    isLoadingBalance,
    connectors,
  };
};
