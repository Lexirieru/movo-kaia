"use client";

import { ReactNode, useEffect, useState } from "react";
import { useWallet } from "@/lib/walletContext";
import { useAuth } from "@/lib/userContext";

interface DashboardWrapperProps {
  children: ReactNode;
}

export default function DashboardWrapper({ children }: DashboardWrapperProps) {
  const { isConnected, isLoading, isWalletSyncing, address, setRefreshUserCallback } = useWallet();
  const { user, loading, isRefreshing, refreshUser, currentWalletAddress } = useAuth();
  const [isInitialSync, setIsInitialSync] = useState(false);

  // Setup callback untuk refresh user dari wallet context
  useEffect(() => {
    setRefreshUserCallback(refreshUser);
  }, [refreshUser, setRefreshUserCallback]);

  // Track ketika wallet address berubah dan butuh sync
  useEffect(() => {
    if (isConnected && address && address !== currentWalletAddress && !isInitialSync && !isWalletSyncing) {
      console.log("🔄 Address changed, setting initial sync flag");
      setIsInitialSync(true);
      
      // Auto clear flag setelah beberapa detik sebagai fallback
      const timeout = setTimeout(() => {
        setIsInitialSync(false);
      }, 5000);
      
      return () => clearTimeout(timeout);
    }
  }, [isConnected, address, currentWalletAddress, isInitialSync, isWalletSyncing]);

  // Clear initial sync flag ketika current wallet address sudah match
  useEffect(() => {
    if (isInitialSync && address === currentWalletAddress) {
      console.log("✅ Wallet sync completed, clearing initial sync flag");
      setIsInitialSync(false);
    }
  }, [isInitialSync, address, currentWalletAddress]);

  // Show loading state jika sedang loading, syncing, atau initial sync
  if (isLoading || loading || isWalletSyncing || isRefreshing || isInitialSync) {
    let loadingMessage = "Checking wallet connection...";
    
    if (isWalletSyncing) {
      loadingMessage = "Syncing wallet with account...";
    } else if (isRefreshing) {
      loadingMessage = "Refreshing user data...";
    } else if (isInitialSync) {
      loadingMessage = "Loading wallet data...";
    }

    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (user?.walletAddress && !isConnected) {
    return <>{children}</>;
    // return <WalletWarning />;
  }
  
  return <>{children}</>;
}
