"use client";

import { useState } from "react";
import Image from "next/image";
import SenderDashboard from "../components/dashboard/SenderDashboard";
import ReceiverDashboard from "../components/dashboard/RecieverDashboard";
import DashboardWrapper from "../components/dashboard/DashboardWrapper";
import WalletWarning from "../components/dashboard/WalletWarning";

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
  const { user, loading, authenticated } = useAuth();
  const { isConnected, address } = useWallet();

  const [mockAddress, setMockAddress] = useState<string | null>(null);

  const walletAddress = mockAddress || user?.walletAddress || address || null;

  // const walletAddress = user?.walletAddress || address || null;

  // console.log(user,authenticated)
  // Dummy role mapping
  const senderAddresses = ["0x123...", "0xabc..."];
  const receiverAddresses = ["0x456...", "0xdef..."];

  let role: "sender" | "receiver" | "unknown" = "unknown";
  if (walletAddress) {
    if (senderAddresses.includes(walletAddress)) role = "sender";
    else if (receiverAddresses.includes(walletAddress)) role = "receiver";
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Header */}
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

          {/* Wallet Connect */}
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

          {/* Quick Switch (Testing Only) */}
          <div className="flex items-center gap-3 ml-4">
            <button
              onClick={() => setMockAddress("0x123...")}
              className="px-3 py-1 bg-blue-600 rounded-md text-sm text-white"
            >
              📤 Sender
            </button>
            <button
              onClick={() => setMockAddress("0x456...")}
              className="px-3 py-1 bg-green-600 rounded-md text-sm text-white"
            >
              📥 Receiver
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 relative z-0">
        <DashboardWrapper>
          {loading ? (
            <p className="text-gray-400 text-center mt-20">Loading...</p>
          ) : // ) : !walletAddress ? (
          //   <WalletWarning />
          role === "sender" ? (
            <GroupDashboard />
          ) : role === "receiver" ? (
            <ReceiverDashboard />
          ) : (
            <GroupDashboard />
          )}
        </DashboardWrapper>
      </div>
    </section>
  );
}
