"use client";

import React from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

interface WalletButtonProps {
  className?: string;
  showBalance?: boolean;
  showNetwork?: boolean;
}

export default function WalletButton({
  className = "",
  showBalance = false,
  showNetwork = false,
}: WalletButtonProps) {
  return (
    <div className={className}>
      <ConnectButton
        showBalance={showBalance}
        chainStatus="icon"
        accountStatus={{
          smallScreen: "avatar",
          largeScreen: "full",
        }}
      />
    </div>
  );
}

// Compact version for mobile
export function WalletButtonCompact({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={className}>
      <ConnectButton
        showBalance={false}
        chainStatus="none"
        accountStatus="avatar"
      />
    </div>
  );
}
