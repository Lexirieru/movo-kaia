'use client';

import { useAccount, useConnect, useDisconnect, useSwitchChain, useBalance } from 'wagmi';

interface WalletState {
  isConnected: boolean;
  account: string | null;
  isLoading: boolean;
  error: string | null;
  currentChainId: number | null;
  walletType: 'wagmi' | null;
}

interface WalletActions {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  getBalance: () => Promise<string>;
  switchNetwork: (chainId: number) => Promise<void>;
  getCurrentChain: () => { id: number; name: string; logo: string } | null;
}

export const useWallet = (): WalletState & WalletActions => {
  // Wagmi hooks
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { switchChain: wagmiSwitchChain, isPending: isSwitching } = useSwitchChain();
  const { data: balance, isLoading: isLoadingBalance } = useBalance({
    address: address,
  });

  // Connect wallet function
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

  // Disconnect wallet function
  const disconnectWallet = async () => {
    try {
      await wagmiDisconnect();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      throw error;
    }
  };

  // Switch network function
  const switchNetworkWallet = async (targetChainId: number) => {
    try {
      await wagmiSwitchChain({ chainId: targetChainId });
    } catch (error) {
      console.error('Failed to switch network:', error);
      throw error;
    }
  };

  // Get balance function
  const getBalanceWallet = async (): Promise<string> => {
    if (!address) {
      throw new Error('Wallet not connected');
    }
    if (balance) {
      return balance.formatted;
    }
    return '0';
  };

  // Get current chain function
  const getCurrentChain = () => {
    if (!chainId) {
      return null;
    }
    
    const chainMap: Record<number, { name: string; logo: string }> = {
      84532: { name: 'Base Sepolia', logo: '/chain/base-logo.svg' },
      8453: { name: 'Base', logo: '/chain/base-logo.svg' },
    };
    
    const currentChain = chainMap[chainId];
    return currentChain ? {
      id: chainId,
      name: currentChain.name,
      logo: currentChain.logo
    } : null;
  };

  return {
    // State
    isConnected,
    account: address,
    isLoading: isConnecting || isSwitching,
    error: null, // wagmi handles errors internally
    currentChainId: chainId,
    walletType: 'wagmi',
    
    // Actions
    connect: connectWallet,
    disconnect: disconnectWallet,
    getBalance: getBalanceWallet,
    switchNetwork: switchNetworkWallet,
    getCurrentChain,
  };
};
