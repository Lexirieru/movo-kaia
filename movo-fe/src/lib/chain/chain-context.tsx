"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, memo } from 'react';
import { Chain } from '@/types';
import { 
  getCurrentChainId, 
  setCurrentChainId, 
  getChainById, 
  getDefaultChain,
  getAllChains 
} from './chain-utils';

interface ChainContextType {
  currentChain: Chain;
  currentChainId: number;
  allChains: Chain[];
  setChain: (chainId: number) => void;
  switchToNextChain: () => void;
  switchToPreviousChain: () => void;
  isChainSupported: (chainId: number) => boolean;
}

const ChainContext = createContext<ChainContextType | undefined>(undefined);

interface ChainProviderProps {
  children: React.ReactNode;
}

export const ChainProvider = memo(function ChainProvider({ children }: ChainProviderProps) {
  const [currentChainId, setCurrentChainIdState] = useState<number>(getCurrentChainId);
  const [allChains] = useState<Chain[]>(getAllChains());

  // Get current chain object
  const currentChain = getChainById(currentChainId) || getDefaultChain();

  // Set chain function
  const setChain = useCallback((chainId: number) => {
    if (allChains.some(chain => chain.id === chainId)) {
      setCurrentChainIdState(chainId);
      setCurrentChainId(chainId);
    }
  }, [allChains]);

  // Switch to next chain
  const switchToNextChain = useCallback(() => {
    const currentIndex = allChains.findIndex(chain => chain.id === currentChainId);
    const nextIndex = (currentIndex + 1) % allChains.length;
    setChain(allChains[nextIndex].id);
  }, [currentChainId, allChains, setChain]);

  // Switch to previous chain
  const switchToPreviousChain = useCallback(() => {
    const currentIndex = allChains.findIndex(chain => chain.id === currentChainId);
    const prevIndex = currentIndex === 0 ? allChains.length - 1 : currentIndex - 1;
    setChain(allChains[prevIndex].id);
  }, [currentChainId, allChains, setChain]);

  // Check if chain is supported
  const isChainSupported = useCallback((chainId: number) => {
    return allChains.some(chain => chain.id === chainId);
  }, [allChains]);

  // Sync with localStorage on mount
  useEffect(() => {
    const storedChainId = getCurrentChainId();
    if (storedChainId !== currentChainId) {
      setCurrentChainIdState(storedChainId);
    }
  }, [currentChainId]);

  const value: ChainContextType = {
    currentChain,
    currentChainId,
    allChains,
    setChain,
    switchToNextChain,
    switchToPreviousChain,
    isChainSupported,
  };

  return (
    <ChainContext.Provider value={value}>
      {children}
    </ChainContext.Provider>
  );
});

// Custom hook to use chain context
export function useChain(): ChainContextType {
  const context = useContext(ChainContext);
  if (context === undefined) {
    throw new Error('useChain must be used within a ChainProvider');
  }
  return context;
}

// Hook for getting current chain ID only
export function useCurrentChainId(): number {
  const { currentChainId } = useChain();
  return currentChainId;
}

// Hook for getting current chain object only
export function useCurrentChain(): Chain {
  const { currentChain } = useChain();
  return currentChain;
}
