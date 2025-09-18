import { useConnect, useDisconnect, useSwitchNetwork } from 'wagmi';
import { useCallback, useState } from 'react';
import { useWalletContext } from '@/lib/contexts/WalletContext';

// Hook untuk aksi wallet (write operations)
export function useWalletWrite() {
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchNetwork } = useSwitchNetwork();
  const { connect: contextConnect, disconnect: contextDisconnect, switchNetwork: contextSwitchNetwork } = useWalletContext();
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Connect wallet
  const connectWallet = useCallback(async (connectorId?: string) => {
    try {
      setIsConnecting(true);
      setError(null);
      
      if (connectorId) {
        await contextConnect(connectorId);
      } else {
        await contextConnect();
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to connect wallet');
      setError(error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [contextConnect]);

  // Disconnect wallet
  const disconnectWallet = useCallback(async () => {
    try {
      setIsDisconnecting(true);
      setError(null);
      await contextDisconnect();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to disconnect wallet');
      setError(error);
      throw error;
    } finally {
      setIsDisconnecting(false);
    }
  }, [contextDisconnect]);

  // Switch network
  const switchNetworkWallet = useCallback(async (chainId: number) => {
    try {
      setIsSwitching(true);
      setError(null);
      await contextSwitchNetwork(chainId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to switch network');
      setError(error);
      throw error;
    } finally {
      setIsSwitching(false);
    }
  }, [contextSwitchNetwork]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Actions
    connect: connectWallet,
    disconnect: disconnectWallet,
    switchNetwork: switchNetworkWallet,
    clearError,
    
    // Loading states
    isConnecting,
    isDisconnecting,
    isSwitching,
    isLoading: isConnecting || isDisconnecting || isSwitching,
    
    // Error state
    error,
    hasError: !!error,
  };
}

// Hook untuk koneksi wallet dengan connector tertentu
export function useWalletConnect(connectorId: string) {
  const { connect, connectors } = useConnect();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const connectWithConnector = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      const connector = connectors.find(c => c.id === connectorId);
      if (!connector) {
        throw new Error(`Connector ${connectorId} not found`);
      }

      await connect({ connector });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to connect wallet');
      setError(error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [connect, connectors, connectorId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    connect: connectWithConnector,
    isConnecting,
    error,
    hasError: !!error,
    clearError,
  };
}

// Hook untuk switch network
export function useWalletSwitchNetwork() {
  const { switchNetwork } = useSwitchNetwork();
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const switchToNetwork = useCallback(async (chainId: number) => {
    try {
      setIsSwitching(true);
      setError(null);
      
      if (!switchNetwork) {
        throw new Error('Switch network not available');
      }

      await switchNetwork(chainId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to switch network');
      setError(error);
      throw error;
    } finally {
      setIsSwitching(false);
    }
  }, [switchNetwork]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    switchNetwork: switchToNetwork,
    isSwitching,
    error,
    hasError: !!error,
    clearError,
  };
}

// Hook untuk disconnect wallet
export function useWalletDisconnect() {
  const { disconnect } = useDisconnect();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const disconnectWallet = useCallback(async () => {
    try {
      setIsDisconnecting(true);
      setError(null);
      await disconnect();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to disconnect wallet');
      setError(error);
      throw error;
    } finally {
      setIsDisconnecting(false);
    }
  }, [disconnect]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    disconnect: disconnectWallet,
    isDisconnecting,
    error,
    hasError: !!error,
    clearError,
  };
}
