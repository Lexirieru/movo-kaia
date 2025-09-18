import { useCallback, useState } from 'react';
import { useWalletRead } from '../read/useWalletRead';
import { useWalletWrite } from './useWalletWrite';
import { useWalletClient } from 'wagmi';

// Hook untuk operasi transaksi wallet
export function useWalletTransaction() {
  const { address, isConnected, chainId } = useWalletRead();
  const { isConnecting, isDisconnecting, isSwitching } = useWalletWrite();
  const { data: walletClient } = useWalletClient();
  
  const [isTransacting, setIsTransacting] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Send transaction
  const sendTransaction = useCallback(async (transaction: {
    to: `0x${string}`;
    value?: bigint;
    data?: `0x${string}`;
    gas?: bigint;
    gasPrice?: bigint;
  }) => {
    if (!walletClient || !isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsTransacting(true);
      setError(null);
      setTransactionHash(null);

      const hash = await walletClient.sendTransaction(transaction);
      setTransactionHash(hash);
      return hash;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Transaction failed');
      setError(error);
      throw error;
    } finally {
      setIsTransacting(false);
    }
  }, [walletClient, isConnected]);

  // Sign message
  const signMessage = useCallback(async (message: string) => {
    if (!walletClient || !isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsTransacting(true);
      setError(null);

      const signature = await walletClient.signMessage({ message });
      return signature;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to sign message');
      setError(error);
      throw error;
    } finally {
      setIsTransacting(false);
    }
  }, [walletClient, isConnected]);

  // Sign typed data
  const signTypedData = useCallback(async (typedData: any) => {
    if (!walletClient || !isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsTransacting(true);
      setError(null);

      const signature = await walletClient.signTypedData(typedData);
      return signature;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to sign typed data');
      setError(error);
      throw error;
    } finally {
      setIsTransacting(false);
    }
  }, [walletClient, isConnected]);

  // Clear transaction state
  const clearTransaction = useCallback(() => {
    setTransactionHash(null);
    setError(null);
  }, []);

  return {
    // Actions
    sendTransaction,
    signMessage,
    signTypedData,
    clearTransaction,
    
    // State
    isTransacting,
    transactionHash,
    error,
    hasError: !!error,
    
    // Wallet state
    isConnected,
    address,
    chainId,
    walletClient,
    
    // Loading states
    isLoading: isTransacting || isConnecting || isDisconnecting || isSwitching,
  };
}

// Hook untuk smart contract operations
export function useWalletContract() {
  const { address, isConnected, chainId } = useWalletRead();
  const { isTransacting, sendTransaction, error, hasError } = useWalletTransaction();
  const [isContractCalling, setIsContractCalling] = useState(false);

  // Call contract function
  const callContract = useCallback(async (contractCall: {
    address: `0x${string}`;
    abi: any[];
    functionName: string;
    args?: any[];
    value?: bigint;
    gas?: bigint;
  }) => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsContractCalling(true);
      setError(null);

      // This would typically use a contract client like viem's getContract
      // For now, we'll simulate the call
      const result = await new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve('Contract call result');
        }, 1000);
      });

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Contract call failed');
      setError(error);
      throw error;
    } finally {
      setIsContractCalling(false);
    }
  }, [isConnected]);

  // Write contract function
  const writeContract = useCallback(async (contractWrite: {
    address: `0x${string}`;
    abi: any[];
    functionName: string;
    args?: any[];
    value?: bigint;
    gas?: bigint;
  }) => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsContractCalling(true);
      setError(null);

      // This would typically use a contract client like viem's getContract
      // For now, we'll simulate the write
      const result = await new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve('Contract write result');
        }, 1000);
      });

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Contract write failed');
      setError(error);
      throw error;
    } finally {
      setIsContractCalling(false);
    }
  }, [isConnected]);

  return {
    // Actions
    callContract,
    writeContract,
    
    // State
    isContractCalling,
    isTransacting,
    error,
    hasError,
    
    // Wallet state
    isConnected,
    address,
    chainId,
    
    // Loading states
    isLoading: isContractCalling || isTransacting,
  };
}
