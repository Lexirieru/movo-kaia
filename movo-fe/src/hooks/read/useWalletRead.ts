import { useAccount, useBalance, useNetwork } from 'wagmi';
import { useWalletContext } from '@/lib/contexts/WalletContext';

// Hook untuk membaca data wallet (read-only)
export function useWalletRead() {
  const { address, isConnected, isConnecting, isDisconnected, chainId, connector } = useAccount();
  const { data: balance } = useBalance({ address });
  const { chain } = useNetwork();
  const { wallet } = useWalletContext();

  return {
    // Connection status
    isConnected,
    isConnecting,
    isDisconnected,
    
    // Wallet info
    address,
    chainId,
    chain,
    connector,
    
    // Balance
    balance: balance?.formatted,
    balanceValue: balance?.value,
    balanceSymbol: balance?.symbol,
    balanceDecimals: balance?.decimals,
    
    // Wallet type
    walletType: wallet.type,
    walletIcon: wallet.isInstalled ? '✅' : '❌',
    
    // Network info
    networkName: chain?.name || 'Unknown',
    isOnCorrectNetwork: chainId === 84532, // Base Sepolia
  };
}

// Hook untuk membaca status wallet saja
export function useWalletStatus() {
  const { isConnected, isConnecting, isDisconnected, address, chainId } = useWalletRead();
  
  return {
    isConnected,
    isConnecting,
    isDisconnected,
    hasAddress: !!address,
    address,
    chainId,
    isReady: isConnected && !!address,
  };
}

// Hook untuk membaca balance wallet
export function useWalletBalance() {
  const { balance, balanceValue, balanceSymbol, balanceDecimals } = useWalletRead();
  
  return {
    balance,
    balanceValue,
    balanceSymbol,
    balanceDecimals,
    hasBalance: !!balanceValue && balanceValue > 0n,
    formattedBalance: balance ? `${balance} ${balanceSymbol}` : '0',
  };
}

// Hook untuk membaca network info
export function useWalletNetwork() {
  const { chainId, chain, networkName, isOnCorrectNetwork } = useWalletRead();
  
  return {
    chainId,
    chain,
    networkName,
    isOnCorrectNetwork,
    isBaseSepolia: chainId === 84532,
    isBaseMainnet: chainId === 8453,
    isKaiaTestnet: chainId === 1001,
  };
}

// Hook untuk membaca wallet type dan info
export function useWalletInfo() {
  const { walletType, walletIcon, address, isConnected } = useWalletRead();
  
  return {
    walletType,
    walletIcon,
    address,
    isConnected,
    isMetaMask: walletType === 'MetaMask',
    isLineWallet: walletType === 'LINE',
    isOKXWallet: walletType === 'OKX',
    isWalletConnect: walletType === 'WalletConnect',
  };
}
