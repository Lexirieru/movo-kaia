import { useWallet } from "./walletContext";
import lineWalletProvider from "./lineWalletProvider";

export const useWalletClientHook = () => {
  const { isConnected, address } = useWallet();

  // Return a wallet client compatible with LINE Mini Dapp
  if (isConnected && address) {
    return {
      account: { address: address as `0x${string}` },
      writeContract: async (request: any) => {
        // For LINE Mini Dapp, we'll use the sendTransaction method
        if (request && typeof request === 'object' && 'to' in request && 'value' in request) {
          return await lineWalletProvider.sendTransaction({
            from: address,
            to: request.to,
            value: request.value,
            gas: request.gas || '0x5208'
          });
        }
        throw new Error("Invalid contract write request");
      },
      simulateContract: async (request: any) => {
        // For simulation, we'll return a mock response
        return {
          request: request,
          result: "0x0" // Mock result
        };
      },
    };
  }

  return null;
};
