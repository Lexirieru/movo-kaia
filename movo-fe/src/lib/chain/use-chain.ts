import { useChain, useCurrentChain, useCurrentChainId } from './chain-context';

// Re-export all chain hooks for convenience
export { useChain, useCurrentChain, useCurrentChainId };

// Additional convenience hooks
export function useChainContracts() {
  const { currentChain } = useChain();
  return currentChain.contracts;
}

export function useChainName() {
  const { currentChain } = useChain();
  return currentChain.name;
}

export function useChainLogo() {
  const { currentChain } = useChain();
  return currentChain.logo;
}

export function useChainRpcUrl() {
  const { currentChain } = useChain();
  return currentChain.rpcUrl;
}

export function useChainBlockExplorer() {
  const { currentChain } = useChain();
  return currentChain.blockExplorer;
}

export function useAllChains() {
  const { allChains } = useChain();
  return allChains;
}

export function useChainActions() {
  const { setChain, switchToNextChain, switchToPreviousChain, isChainSupported } = useChain();
  return {
    setChain,
    switchToNextChain,
    switchToPreviousChain,
    isChainSupported,
  };
}

// Hook for getting escrow contract address
export function useEscrowContract() {
  const { currentChain } = useChain();
  return currentChain.contracts.escrow;
}

// Hook for getting escrowIdrx contract address
export function useEscrowIdrxContract() {
  const { currentChain } = useChain();
  return currentChain.contracts.escrowIdrx;
}

// Hook for getting USDC contract address
export function useUSDCContract() {
  const { currentChain } = useChain();
  return currentChain.contracts.usdc;
}

// Hook for getting USDT contract address
export function useUSDTContract() {
  const { currentChain } = useChain();
  return currentChain.contracts.usdt;
}

// Hook for getting IDRX contract address
export function useIDRXContract() {
  const { currentChain } = useChain();
  return currentChain.contracts.idrx;
}
