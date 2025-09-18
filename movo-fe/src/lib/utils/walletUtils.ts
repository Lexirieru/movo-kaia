import { formatUnits, parseUnits } from 'viem';

export interface WalletInfo {
  address: string;
  chainId: number;
  balance?: string;
  isConnected: boolean;
}

export interface TransactionInfo {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasUsed?: string;
  status: 'pending' | 'success' | 'failed';
}

// Format address for display
export function formatAddress(address: string, length: number = 6): string {
  if (!address) return '';
  if (address.length <= length * 2) return address;
  return `${address.slice(0, length)}...${address.slice(-length)}`;
}

// Format balance for display
export function formatBalance(balance: bigint, decimals: number = 18, precision: number = 4): string {
  try {
    const formatted = formatUnits(balance, decimals);
    const num = parseFloat(formatted);
    return num.toFixed(precision);
  } catch (error) {
    console.error('Error formatting balance:', error);
    return '0.0000';
  }
}

// Parse balance from string
export function parseBalance(balance: string, decimals: number = 18): bigint {
  try {
    return parseUnits(balance, decimals);
  } catch (error) {
    console.error('Error parsing balance:', error);
    return BigInt(0);
  }
}

// Validate Ethereum address
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Validate transaction hash
export function isValidTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

// Get network name from chain ID
export function getNetworkName(chainId: number): string {
  const networks: Record<number, string> = {
    1: 'Ethereum Mainnet',
    8453: 'Base Mainnet',
    84532: 'Base Sepolia',
    1001: 'Kaia Testnet',
    137: 'Polygon Mainnet',
    80001: 'Polygon Mumbai',
  };
  return networks[chainId] || `Unknown Network (${chainId})`;
}

// Get network explorer URL
export function getExplorerUrl(chainId: number): string {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io',
    8453: 'https://basescan.org',
    84532: 'https://sepolia.basescan.org',
    1001: 'https://testnet.kaia.network',
    137: 'https://polygonscan.com',
    80001: 'https://mumbai.polygonscan.com',
  };
  return explorers[chainId] || '';
}

// Get transaction URL
export function getTransactionUrl(txHash: string, chainId: number): string {
  const explorerUrl = getExplorerUrl(chainId);
  return explorerUrl ? `${explorerUrl}/tx/${txHash}` : '';
}

// Get address URL
export function getAddressUrl(address: string, chainId: number): string {
  const explorerUrl = getExplorerUrl(chainId);
  return explorerUrl ? `${explorerUrl}/address/${address}` : '';
}

// Copy to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const result = document.execCommand('copy');
      textArea.remove();
      return result;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

// Get wallet type from address or provider
export function detectWalletType(): 'MetaMask' | 'WalletConnect' | 'LINE' | 'OKX' | 'UNKNOWN' {
  if (typeof window === 'undefined') return 'UNKNOWN';

  const ethereum = (window as any).ethereum;
  if (!ethereum) return 'UNKNOWN';

  // Check for specific wallet providers
  if (ethereum.isMetaMask) return 'MetaMask';
  if (ethereum.isOKXWallet) return 'OKX';
  if (ethereum.isLineWallet) return 'LINE';
  if (ethereum.isWalletConnect) return 'WalletConnect';

  // Check for LINE wallet specific properties
  if ((window as any).LINE) return 'LINE';

  return 'UNKNOWN';
}

// Check if wallet is installed
export function isWalletInstalled(walletType: string): boolean {
  if (typeof window === 'undefined') return false;

  const ethereum = (window as any).ethereum;
  if (!ethereum) return false;

  switch (walletType) {
    case 'MetaMask':
      return !!ethereum.isMetaMask;
    case 'OKX':
      return !!ethereum.isOKXWallet;
    case 'LINE':
      return !!(ethereum.isLineWallet || (window as any).LINE);
    case 'WalletConnect':
      return !!ethereum.isWalletConnect;
    default:
      return false;
  }
}

// Get wallet download URL
export function getWalletDownloadUrl(walletType: string): string {
  const urls: Record<string, string> = {
    MetaMask: 'https://metamask.io/download/',
    OKX: 'https://www.okx.com/web3',
    LINE: 'https://line.me/en/',
    WalletConnect: 'https://walletconnect.com/',
  };
  return urls[walletType] || '';
}

// Format gas price
export function formatGasPrice(gasPrice: bigint): string {
  const gwei = Number(gasPrice) / 1e9;
  return `${gwei.toFixed(2)} Gwei`;
}

// Estimate gas cost
export function estimateGasCost(gasLimit: bigint, gasPrice: bigint): bigint {
  return gasLimit * gasPrice;
}

// Format gas cost in ETH
export function formatGasCost(gasLimit: bigint, gasPrice: bigint): string {
  const cost = estimateGasCost(gasLimit, gasPrice);
  return formatBalance(cost, 18, 6);
}

// Check if network is supported
export function isNetworkSupported(chainId: number): boolean {
  const supportedNetworks = [84532, 8453, 1001]; // Base Sepolia, Base Mainnet, Kaia Testnet
  return supportedNetworks.includes(chainId);
}

// Get recommended gas price
export function getRecommendedGasPrice(): bigint {
  // This is a simplified version - in production, you'd want to fetch from a gas price API
  return parseUnits('20', 'gwei'); // 20 Gwei
}

// Validate transaction parameters
export function validateTransactionParams(params: {
  to: string;
  value?: string;
  gasLimit?: string;
  gasPrice?: string;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!isValidAddress(params.to)) {
    errors.push('Invalid recipient address');
  }

  if (params.value && isNaN(Number(params.value))) {
    errors.push('Invalid value amount');
  }

  if (params.gasLimit && isNaN(Number(params.gasLimit))) {
    errors.push('Invalid gas limit');
  }

  if (params.gasPrice && isNaN(Number(params.gasPrice))) {
    errors.push('Invalid gas price');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
