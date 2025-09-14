"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import ReceiverDashboard from "../components/dashboard/ReceiverDashboard";
import DashboardWrapper from "../components/dashboard/DashboardWrapper";
import WalletWarning from "../components/dashboard/WalletWarning";
import { getUserRole } from "../api/api";
// OnchainKit Wallet Components
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownBasename,
  WalletDropdownLink,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import {
  Address,
  Avatar,
  EthBalance,
  Identity,
  Name,
} from "@coinbase/onchainkit/identity";
import { useAuth } from "@/lib/userContext";
import { useWallet } from "@/lib/walletContext";
import GroupDashboard from "../components/dashboard/GroupDashboard";
import { color } from "@coinbase/onchainkit/theme";

export default function DashboardPage() {
  const { user, loading, authenticated, currentWalletAddress, currentRole } =
    useAuth();
  const { isConnected, address } = useWallet();

  const [userRole, setUserRole] = useState<"sender" | "receiver" | "none">(
    "none",
  );
  const [roleLoading, setRoleLoading] = useState(false);
  const effectiveWalletAddress = currentWalletAddress || address || "";
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

        const roleResult = await getUserRole(user._id, effectiveWalletAddress);
        if (roleResult.success) {
          let determinedRole: "sender" | "receiver" | "none" = "none";
          if (roleResult.hasGroups) {
            determinedRole = "sender";
          } else if (roleResult.hasReceivedPayments) {
            determinedRole = "receiver";
          } else {
            determinedRole = "none";
          }
          setUserRole(determinedRole);
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

  const handleRoleChange = (newRole: "sender" | "receiver" | "none") => {
    setUserRole(newRole);
  };

  const refreshUserRole = async () => {
    if (!user?._id || !effectiveWalletAddress) return;

    setRoleLoading(true);
    try {
      const roleResult = await getUserRole(user._id, effectiveWalletAddress);
      if (roleResult.success) {
        let newRole: "sender" | "receiver" | "none" = "none";

        if (roleResult.hasGroups) {
          newRole = "sender";
        } else if (roleResult.hasReceivedPayments) {
          newRole = "receiver";
        }

        setUserRole(newRole);
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
    <section className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Header - Selalu tampil */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10 relative z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <Image
              src="/movo non-text.png"
              alt="Movo Logo"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <h1 className="text-xl font-bold text-cyan-400">Movo</h1>
          </div>

          <div className="flex items-center space-x-4">
            {effectiveWalletAddress && (
              <div className="flex items-center space-x-2">
                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    userRole === "sender"
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      : userRole === "receiver"
                        ? "bg-green-500/20 text-green-300 border border-green-500/30"
                        : "bg-gray-500/20 text-gray-300 border border-gray-500/30"
                  }`}
                >
                  {roleLoading
                    ? "..."
                    : userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                </div>
              </div>
            )}
            <Wallet className="z-50">
              <ConnectWallet className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold px-6 py-2 rounded-full border border-cyan-400/30 shadow-lg shadow-cyan-500/25 transition-all duration-300">
                <Avatar className="h-6 w-6" />
                <Name className="text-inherit" />
              </ConnectWallet>
              <WalletDropdown className="bg-gray-900/95 backdrop-blur-xl border border-cyan-400/20 rounded-xl shadow-2xl shadow-cyan-500/10 fade-in slide-in-from-top-1.5 animate-in duration-300 ease-out">
                <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                  <Avatar />
                  <Name />
                  <Address className={color.foregroundMuted} />
                  <EthBalance className={color.foregroundMuted} />
                </Identity>
                <WalletDropdownBasename />
                <WalletDropdownLink
                  icon="wallet"
                  href="https://keys.coinbase.com"
                >
                  Wallet
                </WalletDropdownLink>
                <WalletDropdownDisconnect />
              </WalletDropdown>
            </Wallet>
          </div>
        </div>
      </div>

      {/* Main Content - */}
      <div className="container mx-auto px-4 py-6 relative z-0">
        <DashboardWrapper>
          {/* Cek wallet connection dulu */}
          {!isConnected || !address ? (
            <WalletWarning />
          ) : !effectiveWalletAddress ?(
            <div className="text-center py-12">
              <p className="text-gray-400">Connecting wallet...</p>
            </div>
          ): roleLoading? (
            <div className="text-center mt-20">
              <div className="inline-flex items-center space-x-2 text-gray-400">
                <div className="w-6 h-6 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin"></div>
                <span>Determining role...</span>
              </div>
            </div>
          ) : userRole === "receiver" ? (
            <ReceiverDashboard />
          ) : (
            <>
              {userRole === "none" && (
                <div className="text-center mt-12 mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2">Welcome to Movo</h2>
                  <p className="text-gray-400 mb-8">
                    Get started by creating a payment group or wait to receive
                    payments from others
                  </p>
                </div>
              )}
              <GroupDashboard onRoleChange={refreshUserRole} />
            </>
          
            
          )}
        </DashboardWrapper>
      </div>
    </section>
  );
}
