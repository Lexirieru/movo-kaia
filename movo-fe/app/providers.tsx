"use client";

import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { baseSepolia, base, kaia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { WalletProvider } from "@/lib/walletContext";

// Create wagmi config for network switching only
const wagmiConfig = createConfig({
  chains: [baseSepolia, base, kaia],
  connectors: [injected()],
  transports: {
    [baseSepolia.id]: http(),
    [base.id]: http(),
    [kaia.id]: http(),
  },
});

// Create QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
    },
  },
});

export function Providers(props: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletProvider>{props.children}</WalletProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
