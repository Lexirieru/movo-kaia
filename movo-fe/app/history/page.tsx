"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/userContext";
import { useWallet } from "@/lib/walletContext";
import MainLayout from "../components/layout/MainLayout";
import WalletWarning from "../components/dashboard/WalletWarning";

export default function HistoryPage() {
  const { loading, currentWalletAddress, currentRole } = useAuth();
  const { isConnected, address } = useWallet();
  const searchParams = useSearchParams();
  const router = useRouter();
  const effectiveWalletAddress = currentWalletAddress || address || "";

  // Get view parameter from URL
  const viewParam = searchParams.get("view");

  // Redirect based on role or view parameter
  useEffect(() => {
    if (loading) return;

    if (viewParam === "receiver") {
      router.replace("/history/receiver");
    } else if (viewParam === "sender") {
      router.replace("/history/sender");
    } else if (currentRole === "receiver") {
      router.replace("/history/receiver");
    } else if (currentRole === "sender" || currentRole === "none") {
      router.replace("/history/sender");
    }
  }, [loading, viewParam, currentRole, router]);

  if (loading) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading history...</p>
        </div>
      </section>
    );
  }

  return (
    <MainLayout>
      <div className="px-4 py-6 min-h-[calc(100vh-9rem)]">
        <div className="container mx-auto">
          {!isConnected || !address ? (
            <WalletWarning />
          ) : !effectiveWalletAddress ? (
            <div className="text-center py-12">
              <p className="text-gray-400">Connecting wallet...</p>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
              <p className="text-gray-400">Redirecting to history...</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
