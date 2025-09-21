import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';

// Define Kaia mainnet chain
const kaia = defineChain({
  id: 8217,
  name: 'Kaia',
  nativeCurrency: {
    decimals: 18,
    name: 'KAIA',
    symbol: 'KAIA',
  },
  rpcUrls: {
    default: {
      http: ['https://klaytn.drpc.org'],
    },
    public: {
      http: ['https://klaytn.drpc.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'KlaytnScope',
      url: 'https://scope.klaytn.com',
    },
  },
});

export const config = getDefaultConfig({
  appName: 'Movo Kaia',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'your-project-id',
  chains: [kaia],
  ssr: true,
});
