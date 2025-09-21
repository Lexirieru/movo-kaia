"use client";

import React from "react";
import MainLayout from "@/components/layout/MainLayout";
import { User, Sparkles, Wallet, AlertCircle } from "lucide-react";
import { useWallet } from "@/lib/walletContext";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import TokenBalanceCard from "@/components/profile/TokenBalanceCard";
import NetworkSwitch from "@/components/shared/NetworkSwitch";

const ProfilePage = () => {
  const { isConnected, address, disconnect, connectWallet, isConnecting } =
    useWallet();
  const { balances, loading, error, refetch } = useTokenBalances();

  return (
    <MainLayout showRoleBadge={false}>
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-8">
            {/* Animated Icon Container */}
            <div className="relative mb-6">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-cyan-400/20 to-blue-600/20 rounded-full flex items-center justify-center border border-cyan-500/30 backdrop-blur-sm">
                <User className="w-12 h-12 text-cyan-400" />
              </div>

              {/* Floating sparkles animation */}
              <div className="absolute -top-2 -right-2 animate-bounce delay-100">
                <Sparkles className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="absolute -bottom-1 -left-3 animate-bounce delay-300">
                <Sparkles className="w-4 h-4 text-pink-400" />
              </div>
              <div className="absolute top-1 -left-4 animate-pulse">
                <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Profile
              <span className="text-transparent bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text ml-3">
                Dashboard
              </span>
            </h1>

            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
              Manage your wallet and view your token balances
            </p>
          </div>

          {/* Wallet Connection & Network Controls Section */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-cyan-400" />
                Wallet & Network
              </h2>
            </div>

            {isConnected ? (
              <div className="space-y-6">
                {/* Connected Status */}
                <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400 font-medium">
                    Wallet Connected
                  </span>
                </div>

                {/* Address Display */}
                {address && (
                  <div className="p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">
                      Connected Address
                    </p>
                    <p className="text-sm text-white font-mono break-all">
                      {address}
                    </p>
                  </div>
                )}

                {/* Network Controls */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-cyan-400 to-blue-600 rounded-full"></div>
                    Network Settings
                  </h3>
                  <NetworkSwitch />
                </div>

                {/* Wallet Controls */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={async () => {
                      try {
                        await disconnect();
                        console.log("✅ Wallet disconnected successfully");
                      } catch (error) {
                        console.error("❌ Error disconnecting wallet:", error);
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 text-red-400 rounded-lg transition-all duration-200 text-sm font-medium"
                  >
                    Disconnect Wallet
                  </button>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(address || "");
                      // You can add a toast notification here
                    }}
                    className="flex-1 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-500/30 text-cyan-400 rounded-lg transition-all duration-200 text-sm font-medium"
                  >
                    Copy Address
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="flex items-center gap-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg mb-4">
                  <AlertCircle className="w-4 h-4 text-orange-400" />
                  <span className="text-orange-400 text-sm">
                    No wallet connected
                  </span>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  Connect your wallet to access all features including token
                  balances and escrow management
                </p>

                {/* Connect Wallet Button */}
                <button
                  onClick={async () => {
                    try {
                      await connectWallet();
                      console.log(
                        "✅ Wallet connected successfully from profile",
                      );
                    } catch (error) {
                      console.error("❌ Error connecting wallet:", error);
                    }
                  }}
                  disabled={isConnecting}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2 mx-auto ${
                    isConnecting
                      ? "bg-gray-500/50 text-gray-300 cursor-not-allowed"
                      : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-105"
                  }`}
                >
                  {isConnecting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <Wallet className="w-5 h-5" />
                      <span>Connect Wallet</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Token Balances Section */}
          {isConnected ? (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <div className="w-5 h-5 bg-gradient-to-r from-cyan-400 to-blue-600 rounded-full"></div>
                  Token Balances
                </h2>
                <div className="text-sm text-gray-400">
                  Base Sepolia Network
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg mb-6">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-400">{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {balances.map((token) => (
                  <TokenBalanceCard
                    key={token.symbol}
                    symbol={token.symbol}
                    name={token.name}
                    balance={token.balance}
                    formattedBalance={token.formattedBalance}
                    logo={token.logo}
                    loading={loading}
                    decimals={token.decimals}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 text-center">
              <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                Connect Your Wallet
              </h3>
              <p className="text-gray-400 mb-6">
                Connect your wallet to view your token balances and manage your
                profile
              </p>

              {/* Connect Wallet Button */}
              <button
                onClick={async () => {
                  try {
                    await connectWallet();
                    console.log(
                      "✅ Wallet connected successfully from profile",
                    );
                  } catch (error) {
                    console.error("❌ Error connecting wallet:", error);
                  }
                }}
                disabled={isConnecting}
                className={`px-8 py-4 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-3 mx-auto ${
                  isConnecting
                    ? "bg-gray-500/50 text-gray-300 cursor-not-allowed"
                    : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-105"
                }`}
              >
                {isConnecting ? (
                  <>
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Wallet className="w-6 h-6" />
                    <span>Connect Wallet</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Background decorations */}
          <div className="fixed inset-0 pointer-events-none">
            <div className="absolute top-20 left-10 w-32 h-32 bg-cyan-400/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-32 right-16 w-40 h-40 bg-blue-600/5 rounded-full blur-3xl"></div>
            <div className="absolute top-1/2 left-1/4 w-20 h-20 bg-purple-500/5 rounded-full blur-2xl animate-pulse"></div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ProfilePage;
