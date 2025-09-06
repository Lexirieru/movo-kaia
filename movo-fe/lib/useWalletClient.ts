import { useWalletClient } from 'wagmi';
import { useWallet } from './walletContext';

export const useWalletClientHook = () => {
  const { data: wagmiWalletClient } = useWalletClient();
  const { isConnected, address } = useWallet();
  
  // Return a mock wallet client if wagmi is not available but wallet is connected
  if (!wagmiWalletClient && isConnected && address) {
    return {
      account: { address: address as `0x${string}` },
      writeContract: async (request: unknown) => {
        throw new Error('Wallet client not ready. Please try reconnecting your wallet.');
      },
      simulateContract: async (request: unknown) => {
        throw new Error('Wallet client not ready. Please try reconnecting your wallet.');
      }
    };
  }
  
  return wagmiWalletClient;
};
