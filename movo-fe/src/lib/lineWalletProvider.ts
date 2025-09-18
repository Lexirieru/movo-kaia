// Dynamic import to avoid SSR issues
let DappPortalSDK: any = null;

// LINE Mini Dapp configuration
const LINE_WALLET_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_LINE_CLIENT_ID || '53cf0296-4fd3-4573-88ff-6cbc50b5a4f8',
  clientSecret: process.env.NEXT_PUBLIC_LINE_CLIENT_SECRET || 'c4cb2500-b336-4594-931d-21bf0434005d',
  dappId: process.env.NEXT_PUBLIC_LINE_DAPP_ID || 'N68c224f636f5a3565ea5cf82',
  dappName: process.env.NEXT_PUBLIC_LINE_DAPP_NAME || 'movo',
  chainId: process.env.NEXT_PUBLIC_LINE_CHAIN_ID || '84532', // Base Sepolia - change to '8453' for mainnet
  chainNodeRpcEndpoint: process.env.NEXT_PUBLIC_LINE_RPC_ENDPOINT || 'https://sepolia.base.org', // Base Sepolia RPC
};

class LineWalletProvider {
  private sdk: any = null;
  private walletProvider: any = null;
  private _isInitialized = false;

  get isInitialized() {
    return this._isInitialized;
  }

  async init() {
    if (this.isInitialized) {
      return;
    }

    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      console.warn('LINE Mini Dapp SDK can only be initialized in browser environment');
      return;
    }

    try {
      console.log('🔄 Initializing LINE Mini Dapp SDK...');
      console.log('Configuration:', LINE_WALLET_CONFIG);
      
      // Check if LINE Wallet is available
      console.log('Window objects check:', {
        hasLineWallet: !!(window as any).lineWallet,
        hasEthereum: !!(window as any).ethereum,
        hasOkxwallet: !!(window as any).okxwallet,
      });

      // Dynamic import to avoid SSR issues
      if (!DappPortalSDK) {
        console.log('📦 Importing @linenext/dapp-portal-sdk...');
        const module = await import('@linenext/dapp-portal-sdk');
        DappPortalSDK = module.default;
        console.log('✅ SDK imported successfully');
      }

      console.log('🔧 Initializing SDK with config...');
      this.sdk = await DappPortalSDK.init({
        clientId: LINE_WALLET_CONFIG.clientId,
        chainId: LINE_WALLET_CONFIG.chainId,
        chainNodeRpcEndpoint: LINE_WALLET_CONFIG.chainNodeRpcEndpoint,
      });
      
      console.log('✅ SDK initialized, getting wallet provider...');
      this.walletProvider = this.sdk.getWalletProvider();
      this._isInitialized = true;
      
      console.log('✅ LINE Mini Dapp SDK initialized successfully');
      console.log('Wallet provider methods:', Object.keys(this.walletProvider || {}));
    } catch (error) {
      console.error('❌ Failed to initialize LINE Mini Dapp SDK:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  async connectWallet() {
    if (typeof window === 'undefined') {
      throw new Error('Wallet connection is only available in browser environment');
    }

    if (!this.isInitialized) {
      await this.init();
    }

    try {
      console.log('🔌 Starting LINE Wallet connection...');
      
      // Try multiple methods to connect wallet first
      let accounts: string[] = [];
      
      // Method 1: Try LINE Wallet specific method first
      try {
        console.log('🔄 Trying LINE Wallet specific method...');
        accounts = await this.walletProvider.request({ 
          method: 'kaia_requestAccounts' 
        }) as string[];
        console.log('✅ LINE Wallet method successful:', accounts);
      } catch (lineError) {
        console.log('⚠️ LINE Wallet method failed, trying Ethereum method...', lineError);
        
        // Method 2: Try standard Ethereum method
        try {
          accounts = await this.walletProvider.request({ 
            method: 'eth_requestAccounts' 
          }) as string[];
          console.log('✅ Ethereum method successful:', accounts);
        } catch (ethError) {
          console.log('⚠️ Ethereum method failed, trying wallet_requestPermissions...', ethError);
          
          // Method 3: Try wallet_requestPermissions
          try {
            await this.walletProvider.request({
              method: 'wallet_requestPermissions',
              params: [{ eth_accounts: {} }]
            });
            
            // Then get accounts
            accounts = await this.walletProvider.request({ 
              method: 'eth_accounts' 
            }) as string[];
            console.log('✅ wallet_requestPermissions method successful:', accounts);
          } catch (permError) {
            console.error('❌ All connection methods failed:', permError);
            throw new Error('Failed to connect wallet. Please ensure LINE Wallet is installed and unlocked.');
          }
        }
      }
      
      if (accounts && accounts.length > 0) {
        console.log('✅ Wallet connected successfully:', accounts[0]);
        
        // After successful connection, try to switch to Base Sepolia
        try {
          console.log('🔄 Switching to Base Sepolia after connection...');
          await this.switchToBaseSepolia();
        } catch (switchError) {
          console.warn('⚠️ Failed to switch to Base Sepolia, but wallet is connected:', switchError);
          // Don't throw error here, wallet is still connected
        }
        
        return accounts[0];
      } else {
        throw new Error('No accounts returned from wallet');
      }
    } catch (error: any) {
      console.error('❌ Failed to connect wallet:', error);
      throw error;
    }
  }

  async getAccount() {
    if (typeof window === 'undefined') {
      return null;
    }

    if (!this.isInitialized) {
      await this.init();
    }

    try {
      let accounts: string[] = [];
      
      // Try LINE Wallet specific method first
      try {
        accounts = await this.walletProvider.request({ 
          method: 'kaia_accounts' 
        }) as string[];
      } catch (lineError) {
        // Fallback to Ethereum method
        try {
          accounts = await this.walletProvider.request({ 
            method: 'eth_accounts' 
          }) as string[];
        } catch (ethError) {
          console.error('Failed to get account:', ethError);
          return null;
        }
      }
      
      return accounts && accounts.length > 0 ? accounts[0] : null;
    } catch (error) {
      console.error('Failed to get account:', error);
      return null;
    }
  }

  async getBalance(account: string) {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      const balance = await this.walletProvider.request({
        method: 'kaia_getBalance',
        params: [account, 'latest']
      });
      
      return balance;
    } catch (error) {
      console.error('Failed to get balance:', error);
      throw error;
    }
  }

  async getChainId() {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      // Try kaia_chainId first (LINE Wallet specific)
      const chainId = await this.walletProvider.request({
        method: 'kaia_chainId'
      });
      
      console.log('LINE Wallet Chain ID:', chainId);
      return chainId;
    } catch (error) {
      console.warn('kaia_chainId failed, trying eth_chainId:', error);
      try {
        // Fallback to eth_chainId
        const chainId = await this.walletProvider.request({
          method: 'eth_chainId'
        });
        console.log('Ethereum Chain ID:', chainId);
        return chainId;
      } catch (ethError) {
        console.error('Both chain ID methods failed:', ethError);
        // Fallback to configured chain ID
        return `0x${parseInt(LINE_WALLET_CONFIG.chainId).toString(16)}`;
      }
    }
  }

  async signMessage(message: string, account: string) {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      const signature = await this.walletProvider.request({
        method: 'personal_sign',
        params: [message, account]
      });
      
      return signature;
    } catch (error) {
      console.error('Failed to sign message:', error);
      throw error;
    }
  }

  async connectAndSign(message: string) {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      const [account, signature] = await this.walletProvider.request({
        method: 'kaia_connectAndSign',
        params: [message]
      }) as string[];
      
      return { account, signature };
    } catch (error) {
      console.error('Failed to connect and sign:', error);
      throw error;
    }
  }

  async sendTransaction(transaction: {
    from: string;
    to: string;
    value: string;
    gas: string;
    data?: string;
  }) {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      console.log('📝 Sending transaction via LINE Wallet:', transaction);
      
      // Ensure we're on Base Sepolia before sending transaction
      await this.switchToBaseSepolia();
      
      // Use kaia_sendTransaction method as per LINE Wallet SDK documentation
      const txHash = await this.walletProvider.request({
        method: 'kaia_sendTransaction',
        params: [transaction]
      });
      
      console.log('✅ Transaction sent successfully:', txHash);
      return txHash;
    } catch (error) {
      console.error('❌ Failed to send transaction:', error);
      console.error('Transaction details:', transaction);
      throw error;
    }
  }

  async getErc20TokenBalance(contractAddress: string, account: string) {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      const balance = await this.walletProvider.getErc20TokenBalance(
        contractAddress,
        account
      );
      
      return balance;
    } catch (error) {
      console.error('Failed to get ERC20 token balance:', error);
      throw error;
    }
  }

  async disconnectWallet() {
    if (!this.isInitialized) {
      return;
    }

    try {
      await this.walletProvider.disconnectWallet();
      console.log('Wallet disconnected');
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      throw error;
    }
  }

  getWalletType() {
    if (!this.isInitialized || !this.walletProvider) {
      return null;
    }

    try {
      return this.walletProvider.getWalletType();
    } catch (error) {
      console.error('Failed to get wallet type:', error);
      return null;
    }
  }

  isSupportedBrowser() {
    if (!this.isInitialized || !this.sdk) {
      return false;
    }

    try {
      return this.sdk.isSupportedBrowser();
    } catch (error) {
      console.error('Failed to check browser support:', error);
      return false;
    }
  }

  // Chain switching methods
  async switchToBaseSepolia() {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      console.log('🔄 Switching to Base Sepolia...');
      
      // First, try to switch to Base Sepolia
      await this.walletProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x14a34' }], // Base Sepolia chain ID in hex
      });
      
      console.log('✅ Successfully switched to Base Sepolia');
    } catch (error: any) {
      console.log('⚠️ Chain switch failed, trying to add Base Sepolia...', error);
      
      // If chain is not added, try to add it
      if (error.code === 4902) {
        try {
          await this.walletProvider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x14a34', // Base Sepolia
              chainName: 'Base Sepolia',
              rpcUrls: ['https://sepolia.base.org'],
              nativeCurrency: {
                name: 'Ether',
                symbol: 'ETH',
                decimals: 18,
              },
              blockExplorerUrls: ['https://sepolia.basescan.org'],
            }],
          });
          console.log('✅ Successfully added and switched to Base Sepolia');
        } catch (addError) {
          console.error('❌ Failed to add Base Sepolia chain:', addError);
          throw addError;
        }
      } else {
        console.error('❌ Failed to switch to Base Sepolia:', error);
        throw error;
      }
    }
  }

  async switchToBaseMainnet() {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      console.log('🔄 Switching to Base Mainnet...');
      
      await this.walletProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }], // Base Mainnet chain ID in hex
      });
      
      console.log('✅ Successfully switched to Base Mainnet');
    } catch (error: any) {
      console.log('⚠️ Chain switch failed, trying to add Base Mainnet...', error);
      
      if (error.code === 4902) {
        try {
          await this.walletProvider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x2105', // Base Mainnet
              chainName: 'Base',
              rpcUrls: ['https://mainnet.base.org'],
              nativeCurrency: {
                name: 'Ether',
                symbol: 'ETH',
                decimals: 18,
              },
              blockExplorerUrls: ['https://basescan.org'],
            }],
          });
          console.log('✅ Successfully added and switched to Base Mainnet');
        } catch (addError) {
          console.error('❌ Failed to add Base Mainnet chain:', addError);
          throw addError;
        }
      } else {
        console.error('❌ Failed to switch to Base Mainnet:', error);
        throw error;
      }
    }
  }

  async switchToKaiaTestnet() {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      console.log('🔄 Switching to Kaia Testnet...');
      
      await this.walletProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x3e9' }], // Kaia Testnet chain ID in hex
      });
      
      console.log('✅ Successfully switched to Kaia Testnet');
    } catch (error: any) {
      console.log('⚠️ Chain switch failed, trying to add Kaia Testnet...', error);
      
      if (error.code === 4902) {
        try {
          await this.walletProvider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x3e9', // Kaia Testnet
              chainName: 'Kaia Testnet',
              rpcUrls: ['https://testnet.kaia.network'],
              nativeCurrency: {
                name: 'Kaia',
                symbol: 'KAI',
                decimals: 18,
              },
              blockExplorerUrls: ['https://testnet.kaia.network'],
            }],
          });
          console.log('✅ Successfully added and switched to Kaia Testnet');
        } catch (addError) {
          console.error('❌ Failed to add Kaia Testnet chain:', addError);
          throw addError;
        }
      } else {
        console.error('❌ Failed to switch to Kaia Testnet:', error);
        throw error;
      }
    }
  }

  // Get current chain ID as number
  async getCurrentChainId(): Promise<number> {
    try {
      const chainIdHex = await this.getChainId();
      return parseInt(chainIdHex, 16);
    } catch (error) {
      console.error('Failed to get current chain ID:', error);
      return 84532; // Default to Base Sepolia
    }
  }

  // Check if currently on Base Sepolia
  async isOnBaseSepolia(): Promise<boolean> {
    try {
      const chainId = await this.getCurrentChainId();
      return chainId === 84532;
    } catch (error) {
      console.error('Failed to check if on Base Sepolia:', error);
      return false;
    }
  }
}

// Create singleton instance
const lineWalletProvider = new LineWalletProvider();

export default lineWalletProvider;
