"use client";

import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';

interface UseWalletConnectionGuardReturn {
  /** Whether the guard is currently active */
  isGuardActive: boolean;
  /** Currently selected action */
  selectedAction: string | null;
  /** Function to trigger wallet connection guard */
  triggerWalletGuard: (action: string) => void;
  /** Function to handle when wallet is ready */
  handleWalletReady: () => void;
  /** Function to cancel wallet connection */
  handleCancelWallet: () => void;
  /** Function to proceed with action after wallet is ready */
  proceedWithAction: (callback: (action: string) => void) => void;
  /** Whether wallet is ready (connected and on correct chain) */
  isWalletReady: boolean;
}

const TARGET_CHAIN_ID = 84532; // Base Sepolia

export function useWalletConnectionGuard(): UseWalletConnectionGuardReturn {
  const [isGuardActive, setIsGuardActive] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<((action: string) => void) | null>(null);

  const { isConnected, chainId } = useAccount();
  const isOnTargetChain = chainId === TARGET_CHAIN_ID;

  const triggerWalletGuard = useCallback((action: string) => {
    setSelectedAction(action);
    
    // If wallet is already connected and on the right chain, proceed directly
    if (isConnected && isOnTargetChain) {
      return;
    }

    // Otherwise, show the wallet connection guard
    setIsGuardActive(true);
  }, [isConnected, isOnTargetChain]);

  const handleWalletReady = useCallback(() => {
    setIsGuardActive(false);
    
    // Execute pending action if there is one
    if (pendingAction && selectedAction) {
      pendingAction(selectedAction);
      setPendingAction(null);
    }
    
    // Don't clear selectedAction here - let the parent component handle it
  }, [pendingAction, selectedAction]);

  const handleCancelWallet = useCallback(() => {
    setIsGuardActive(false);
    setSelectedAction(null);
    setPendingAction(null);
  }, []);

  const proceedWithAction = useCallback((callback: (action: string) => void) => {
    if (!selectedAction) return;

    // If wallet is ready, execute immediately
    if (isConnected && isOnTargetChain) {
      callback(selectedAction);
      return;
    }

    // Otherwise, store the action and trigger wallet guard
    setPendingAction(() => callback);
    setIsGuardActive(true);
  }, [selectedAction, isConnected, isOnTargetChain]);

  return {
    isGuardActive,
    selectedAction,
    triggerWalletGuard,
    handleWalletReady,
    handleCancelWallet,
    proceedWithAction,
    isWalletReady: isConnected && isOnTargetChain,
  };
}
