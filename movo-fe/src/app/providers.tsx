"use client";

import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { ChainProvider } from "@/lib/chain";
import { WalletProvider } from "@/lib/walletContext";
import { config } from "@/lib/wagmi";

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
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <ChainProvider>
          <WalletProvider>{props.children}</WalletProvider>
        </ChainProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
