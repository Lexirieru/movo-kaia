"use client";

import { ReactNode } from "react";
import { useWallet } from "@/lib/walletContext";
import { useAuth } from "@/lib/userContext";

interface DashboardWrapperProps {
  children: ReactNode;
}

export default function DashboardWrapper({ children }: DashboardWrapperProps) {
  const { isConnected, isLoading } = useWallet();
  const { user, loading } = useAuth();

  if (isLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Checking wallet connection...</p>
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
