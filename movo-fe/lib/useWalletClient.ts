import { useWallet } from "./walletContext";
import lineWalletProvider from "./lineWalletProvider";
import { createWalletClient, custom, http, createPublicClient } from "viem";
import { baseSepolia, kaiaTestnet } from "./smartContract";

export const useWalletClientHook = () => {
  const { isConnected, address } = useWallet();

  // Detect which wallet is actually being used
  const detectActualWallet = () => {
    if (typeof window === 'undefined') return 'unknown';
    
    // Check for OKX wallet
    if ((window as any).okxwallet) {
      return 'okx';
    }
    
    // Check for standard Ethereum wallets
    if ((window as any).ethereum) {
      const ethereum = (window as any).ethereum;
      if (ethereum.isOKXWallet || ethereum.isOkxWallet) {
        return 'okx';
      }
      if (ethereum.isMetaMask) {
        return 'metamask';
      }
      return 'ethereum'; // Generic Ethereum wallet
    }
    
    // Check for LINE wallet
    if ((window as any).lineWallet) {
      return 'line';
    }
    
    return 'unknown';
  };

  // Return appropriate wallet client based on actual wallet
  if (isConnected && address) {
    const actualWallet = detectActualWallet();
    console.log("🔍 Detected actual wallet:", actualWallet);
    
    // For OKX, MetaMask, or other Ethereum wallets - return proper viem client
    if (['okx', 'metamask', 'ethereum'].includes(actualWallet)) {
      console.log("✅ Using proper viem wallet client for Ethereum wallet");
      
      // Create proper viem wallet client
      const ethereum = (window as any).ethereum;
      const walletClient = createWalletClient({
        account: address as `0x${string}`,
        chain: baseSepolia,
        transport: custom(ethereum),
      });
      
      // Create public client for simulation
      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(),
      });
      
      return {
        _isEthereumWallet: true,
        account: { address: address as `0x${string}` },
        getChainId: async () => {
          try {
            const chainId = await walletClient.getChainId();
            console.log('Ethereum wallet chain ID:', chainId);
            return chainId;
          } catch (error) {
            console.error('Failed to get chain ID from Ethereum wallet:', error);
            throw error;
          }
        },
        writeContract: async (request: any) => {
          console.log("🔍 Ethereum wallet writeContract called with request:", request);
          try {
            return await walletClient.writeContract(request);
          } catch (error) {
            console.error("❌ Error in writeContract:", error);
            throw error;
          }
        },
        simulateContract: async (request: any) => {
          console.log("🔍 Ethereum wallet simulateContract called with request:", request);
          try {
            return await publicClient.simulateContract(request);
          } catch (error) {
            console.error("❌ Error in simulateContract:", error);
            throw error;
          }
        },
      };
    }
    
    // For LINE wallet - return LINE-specific client
    console.log("✅ Using LINE wallet client");
    return {
      _isLineWallet: true, // Identifier for LINE wallet
      account: { address: address as `0x${string}` },
      getChainId: async () => {
        try {
          const chainId = await lineWalletProvider.getChainId();
          console.log('LINE wallet chain ID:', chainId);
          return chainId;
        } catch (error) {
          console.error('Failed to get chain ID from LINE wallet:', error);
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
