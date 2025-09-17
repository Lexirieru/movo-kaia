import { useWallet } from "./walletContext";
import lineWalletProvider from "./lineWalletProvider";

export const useWalletClientHook = () => {
  const { isConnected, address } = useWallet();

  // Return a wallet client compatible with LINE Mini Dapp
  if (isConnected && address) {
    return {
      account: { address: address as `0x${string}` },
      getChainId: async () => {
        try {
          const chainId = await lineWalletProvider.getChainId();
          console.log('Wallet client getChainId result:', chainId);
          return chainId;
        } catch (error) {
          console.error('Failed to get chain ID from wallet client:', error);
          throw error;
        }
      },
      writeContract: async (request: any) => {
        console.log("🔍 writeContract called with request:", request);
        console.log("Request structure:", {
          hasTo: 'to' in (request || {}),
          hasValue: 'value' in (request || {}),
          hasData: 'data' in (request || {}),
          hasAddress: 'address' in (request || {}),
          hasFunctionName: 'functionName' in (request || {}),
          hasArgs: 'args' in (request || {}),
          keys: Object.keys(request || {})
        });

        try {
          // Handle viem writeContract request structure
          if (request && typeof request === 'object') {
            // Check if it's a viem request with address, abi, functionName, args
            if ('address' in request && 'functionName' in request && 'args' in request) {
              console.log("📝 Processing viem contract call:", {
                address: request.address,
                functionName: request.functionName,
                args: request.args
              });
              
              // For now, we'll need to implement proper contract interaction
              // This is a simplified version - in production you'd need to encode the function call
              throw new Error("Contract calls not yet implemented for LINE wallet. Please use OKX wallet for contract interactions.");
            }
            
            // Check if it's a simple transaction with to, value, data
            if ('to' in request && 'value' in request) {
              console.log("📝 Processing simple transaction:", {
                to: request.to,
                value: request.value,
                data: request.data
              });
              
              return await lineWalletProvider.sendTransaction({
                from: address,
                to: request.to,
                value: request.value || '0x0',
                gas: request.gas || '0x5208',
                data: request.data || '0x'
              });
            }
          }
          
          console.error("❌ Unsupported request structure:", request);
          throw new Error("Invalid contract write request - unsupported structure");
        } catch (error) {
          console.error("❌ Error in writeContract:", error);
          throw error;
        }
      },
      simulateContract: async (request: any) => {
        console.log("🔍 simulateContract called with request:", request);
        
        // For LINE wallet, we can't actually simulate contracts
        // Return a mock response that matches viem's expected structure
        return {
          request: request,
          result: "0x0" // Mock result
        };
      },
    };
  }

  return null;
};
