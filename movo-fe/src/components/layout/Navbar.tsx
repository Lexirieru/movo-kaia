"use client";

import Image from "next/image";
import WalletConnectButton from "../shared/WalletConnectButton";

interface NavbarProps {
  showRoleBadge?: boolean;
}

export default function Navbar({ showRoleBadge = true }: NavbarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 bg-black/20 backdrop-blur-sm border-b border-white/10 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
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

        {/* Wallet Connect Button */}
        <div className="flex items-center space-x-4">
          <WalletConnectButton />
        </div>
      </div>
    </header>
  );
}
