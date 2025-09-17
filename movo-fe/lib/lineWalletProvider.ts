// Dynamic import to avoid SSR issues
let DappPortalSDK: any = null;

// LINE Mini Dapp configuration
const LINE_WALLET_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_LINE_CLIENT_ID || '53cf0296-4fd3-4573-88ff-6cbc50b5a4f8',
  clientSecret: process.env.NEXT_PUBLIC_LINE_CLIENT_SECRET || 'c4cb2500-b336-4594-931d-21bf0434005d',
  dappId: process.env.NEXT_PUBLIC_LINE_DAPP_ID || 'N68c224f636f5a3565ea5cf82',
  dappName: process.env.NEXT_PUBLIC_LINE_DAPP_NAME || 'movo',
  chainId: process.env.NEXT_PUBLIC_LINE_CHAIN_ID || '84532', // Base Sepolia - change to '8453' for mainnet
};

class LineWalletProvider {
  private sdk: any = null;
  private walletProvider: any = null;
  private isInitialized = false;

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
      // Dynamic import to avoid SSR issues
      if (!DappPortalSDK) {
        const module = await import('@linenext/dapp-portal-sdk');
        DappPortalSDK = module.default;
      }

      this.sdk = await DappPortalSDK.init({
        clientId: LINE_WALLET_CONFIG.clientId,
        chainId: LINE_WALLET_CONFIG.chainId,
      });
      
      this.walletProvider = this.sdk.getWalletProvider();
      this.isInitialized = true;
      
      console.log('LINE Mini Dapp SDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize LINE Mini Dapp SDK:', error);
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
      // Request account connection
      const accounts = await this.walletProvider.request({ 
        method: 'kaia_requestAccounts' 
      }) as string[];
      
      if (accounts && accounts.length > 0) {
        console.log('Wallet connected:', accounts[0]);
        return accounts[0];
      } else {
        throw new Error('No accounts returned from wallet');
      }
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
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
      const accounts = await this.walletProvider.request({ 
        method: 'kaia_accounts' 
      }) as string[];
      
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
      const chainId = await this.walletProvider.request({
        method: 'kaia_chainId'
      });
      
      console.log('LINE Wallet Chain ID:', chainId);
      return chainId;
    } catch (error) {
      console.error('Failed to get chain ID:', error);
      // Fallback to configured chain ID
      return LINE_WALLET_CONFIG.chainId;
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
      const txHash = await this.walletProvider.request({
        method: 'kaia_sendTransaction',
        params: [transaction]
      });
      
      return txHash;
    } catch (error) {
      console.error('Failed to send transaction:', error);
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
}

// Create singleton instance
const lineWalletProvider = new LineWalletProvider();

export default lineWalletProvider;
