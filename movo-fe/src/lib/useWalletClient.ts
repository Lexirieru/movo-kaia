import { useWallet } from "./walletContext";
import lineWalletProvider from "./lineWalletProvider";
import { createWalletClient, custom, http, createPublicClient } from "viem";
import { baseSepolia, kaiaTestnet } from "./smartContract";

export const useWalletClientHook = () => {
  const { isConnected, address } = useWallet();

  // Detect which wallet is actually being used
  const detectActualWallet = () => {
    if (typeof window === 'undefined') return 'unknown';
    
    // PRIORITY 1: Check for LINE wallet first (since we're using LINE Wallet SDK)
    if ((window as any).lineWallet) {
      return 'line';
    }
    
    // PRIORITY 2: Check if LINE Mini Dapp SDK is available
    if (lineWalletProvider && lineWalletProvider.isInitialized) {
      return 'line';
    }
    
    // PRIORITY 3: Check for OKX wallet
    if ((window as any).okxwallet) {
      return 'okx';
    }
    
    // PRIORITY 4: Check for standard Ethereum wallets
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
      
      console.log("🔍 Created viem wallet client:", {
        account: walletClient.account,
        chain: walletClient.chain,
        hasTransport: !!walletClient.transport
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
          const chainId = await lineWalletProvider.getCurrentChainId();
          console.log('LINE wallet chain ID:', chainId);
          return chainId;
        } catch (error) {
          console.error('Failed to get chain ID from LINE wallet:', error);
          throw error;
        }
      },
      writeContract: async (request: any) => {
        console.log("🔍 LINE wallet writeContract called with request:", request);
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
              console.log("📝 Processing viem contract call for LINE wallet:", {
                address: request.address,
                functionName: request.functionName,
                args: request.args
              });
              
              // For LINE wallet, we need to use a different approach
              // Since LINE Wallet doesn't support complex contract calls directly,
              // we'll use a public client to simulate and get the transaction data
              try {
                // Import viem functions
                const { createPublicClient, http, encodeFunctionData } = await import('viem');
                
                // Get the ABI from the request
                const abi = request.abi;
                if (!abi) {
                  throw new Error("ABI not provided in contract call request");
                }
                
                // Encode the function call using viem (this doesn't need RPC)
                console.log("🔧 Encoding function call:", {
                  abi: abi ? "present" : "missing",
                  functionName: request.functionName,
                  args: request.args || [],
                  argsLength: (request.args || []).length
                });
                
                const data = encodeFunctionData({
                  abi: abi,
                  functionName: request.functionName,
                  args: request.args || []
                });
                
                console.log("📝 Encoded function data:", data);
                console.log("📝 Data length:", data.length);
                
                // Use a higher default gas limit for contract calls
                let gasEstimate = '0x100000'; // 1M gas default for contract calls
                
                // Try to create a public client for gas estimation, but don't fail if it doesn't work
                try {
                  const { baseSepolia } = await import('./smartContract');
                  const publicClient = createPublicClient({
                    chain: baseSepolia,
                    transport: http('https://sepolia.base.org'), // Use official Base Sepolia RPC
                  });
                  
                  const gasEstimateResult = await publicClient.estimateContractGas({
                    address: request.address as `0x${string}`,
                    abi: abi,
                    functionName: request.functionName,
                    args: request.args || [],
                    account: address as `0x${string}`,
                  });
                  gasEstimate = `0x${gasEstimateResult.toString(16)}`;
                  console.log("📊 Gas estimate:", gasEstimate);
                } catch (gasError) {
                  console.warn("⚠️ Gas estimation failed, using default:", gasError);
                }
                
                // Send transaction using LINE wallet with encoded data
                return await lineWalletProvider.sendTransaction({
                  from: address,
                  to: request.address,
                  value: request.value || '0x0',
                  gas: gasEstimate,
                  data: data
                });
              } catch (encodingError) {
                console.error("❌ Error encoding function call:", encodingError);
                console.error("Encoding error details:", {
                  message: encodingError instanceof Error ? encodingError.message : 'Unknown error',
                  stack: encodingError instanceof Error ? encodingError.stack : undefined,
                  functionName: request.functionName,
                  args: request.args,
                  abiLength: request.abi ? request.abi.length : 0,
                  errorCode: (encodingError as any)?.code,
                  errorData: encodingError
                });
                
                // Provide more specific error messages
                if (encodingError instanceof Error) {
                  if (encodingError.message.includes('Function not found')) {
                    throw new Error(`Function '${request.functionName}' not found in ABI. Please check the function name and ABI.`);
                  } else if (encodingError.message.includes('Invalid argument')) {
                    throw new Error(`Invalid arguments for function '${request.functionName}'. Please check the argument types and values.`);
                  } else if (encodingError.message.includes('rpc method is unsupported')) {
                    throw new Error(`RPC method not supported. Please check your network connection and try again.`);
                  } else {
                    throw new Error(`Failed to encode contract call: ${encodingError.message}`);
                  }
                } else if ((encodingError as any)?.code === -32601) {
                  throw new Error(`RPC method not supported. Please check your network connection and try again.`);
                } else {
                  throw new Error(`Failed to encode contract call: ${JSON.stringify(encodingError)}`);
                }
              }
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
        console.log("🔍 LINE wallet simulateContract called with request:", request);
        
        try {
          // For LINE wallet, we need to create a proper simulation
          // Import viem's simulateContract function
          const { createPublicClient, http } = await import('viem');
          const { baseSepolia } = await import('./smartContract');
          
          // Create a public client for simulation using Base Sepolia
          const publicClient = createPublicClient({
            chain: baseSepolia, // Use Base Sepolia for LINE wallet
            transport: http(),
          });
          
          // Use the public client to simulate the contract call
          const result = await publicClient.simulateContract(request);
          
          console.log("✅ LINE wallet simulation successful:", result);
          return result;
        } catch (error) {
          console.error("❌ Error in simulateContract:", error);
          // Return a mock response that matches viem's expected structure
          return {
            request: request,
            result: "0x0" // Mock result as fallback
          };
        }
      },
    };
  }

  return null;
};
