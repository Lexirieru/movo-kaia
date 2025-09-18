"use client";

import { useEffect, useState, Suspense } from "react";
import ReceiverDashboard from "../components/dashboard/ReceiverDashboard";
import DashboardWrapper from "../components/dashboard/DashboardWrapper";
import WalletWarning from "../components/dashboard/WalletWarning";
import { loadAllWithdrawHistory } from "../api/api";
import { WithdrawHistory } from "@/types/historyTemplate";
import { useAuth } from "@/lib/userContext";
import { useWallet } from "@/lib/walletContext";
import GroupDashboard from "../components/dashboard/GroupDashboard";
import MainLayout from "../components/layout/MainLayout";
import { useSearchParams } from "next/navigation";

function DashboardContent() {
  const { user, loading, authenticated, currentWalletAddress, currentRole } =
    useAuth();
  const { isConnected, address } = useWallet();
  const searchParams = useSearchParams();

  const [userRole, setUserRole] = useState<"sender" | "receiver" | "none">(
    "none",
  );
  const [roleLoading, setRoleLoading] = useState(false);
  const [withdrawHistory, setWithdrawHistory] = useState<WithdrawHistory[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const effectiveWalletAddress = currentWalletAddress || address || "";

  // Get view parameter from URL
  const viewParam = searchParams.get("view");
  // Sync userRole dengan currentRole dari context
  useEffect(() => {
    const determineRole = async () => {
      if (!user?._id || !currentWalletAddress) {
        setUserRole("none");
        return;
      }
      setRoleLoading(true);
      try {
        if (currentRole) {
          setUserRole(currentRole);
        } else {
          setUserRole("none");
        }

        const roleResult = await currentRole;
        if (roleResult) {
          setUserRole(roleResult);
        } else {
          setUserRole("none");
        }
      } catch (error) {
        console.error("Error determining user role:", error);
        setUserRole("none");
      } finally {
        setRoleLoading(false);
      }
    };

    determineRole();
  }, [user?._id, currentWalletAddress, currentRole]);

  // Fetch withdraw history untuk receiver
  useEffect(() => {
    if (
      loading ||
      !user?._id ||
      !currentWalletAddress ||
      hasFetched ||
      userRole !== "receiver"
    )
      return;

    const fetchWithdrawHistory = async () => {
      setWithdrawLoading(true);
      try {
        const historyTemplate = await loadAllWithdrawHistory(
          user._id,
          currentWalletAddress,
        );
        if (!historyTemplate || !Array.isArray(historyTemplate)) {
          console.warn("Withdraw history not found or not an array.");
          setWithdrawHistory([]);
          setHasFetched(true);
          return;
        }

        const templatesWithdrawHistory: WithdrawHistory[] = historyTemplate.map(
          (w: any) => ({
            withdrawId: w.withdrawId,
            receiverId: w.receiverId,
            amount: w.amount,
            choice: w.choice,
            originCurrency: w.originCurrency,
            targetCurrency: w.targetCurrency ?? "",
            networkChainId: w.networkChainId ?? "",
            walletAddress: w.walletAddress ?? "",
            depositWalletAddress: w.depositWalletAddress ?? "",
            bankId: w.bankId ?? "",
            bankName: w.bankName ?? "",
            bankAccountName: w.bankAccountName ?? "",
            bankAccountNumber: w.bankAccountNumber ?? "",
          }),
        );
        setWithdrawHistory(templatesWithdrawHistory);
        setHasFetched(true);
      } catch (err) {
        console.error("Failed to fetch withdraw history", err);
      } finally {
        setWithdrawLoading(false);
      }
    };

    fetchWithdrawHistory();
  }, [loading, user, currentWalletAddress, hasFetched, userRole]);

  // Reset hasFetched ketika currentWalletAddress berubah
  useEffect(() => {
    setHasFetched(false);
    setWithdrawHistory([]);
  }, [currentWalletAddress]);

  const handleRoleChange = (newRole: "sender" | "receiver" | "none") => {
    setUserRole(newRole);
  };

  const refreshUserRole = async () => {
    if (!user?._id || !effectiveWalletAddress) return;

    setRoleLoading(true);
    try {
      const roleResult = await currentRole;
      if (roleResult) {
        setUserRole(roleResult);
      } else {
        setUserRole("none");
      }
    } catch (error) {
      console.error("Error refreshing user role:", error);
    } finally {
      setRoleLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
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
          ) : roleLoading ? (
            <div className="text-center mt-20">
              <div className="inline-flex items-center space-x-2 text-gray-400">
                <div className="w-6 h-6 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin"></div>
                <span>Determining role...</span>
              </div>
            </div>
          ) : viewParam === "receiver" || userRole === "receiver" ? (
            <ReceiverDashboard />
          ) : (
            <>
              {userRole === "none" && (
                <div className="text-center mt-12 mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Welcome to Movo
                  </h2>
                  <p className="text-gray-400 mb-8">
                    Get started by creating a payment group or wait to receive
                    payments from others
                  </p>
                </div>
              )}
              <GroupDashboard onRoleChange={refreshUserRole} />
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <section className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading dashboard...</p>
          </div>
        </section>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
