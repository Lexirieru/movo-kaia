import { Chain } from "@/types";

export const chains: Chain[] = [
  {
    id: 8217, // Kaia Mainnet
    name: "Kaia Mainnet",
    logo: "/chain/kaia-logo.svg",
    rpcUrl: "https://public-en.node.kaia.io",
    blockExplorer: "https://scope.klaytn.com",
    contracts: {
      escrow: "0x0d837aD954F4f9F06E303A86150ad0F322Ec5EB1",
      escrowIdrx: "0x4ce1D1E0e9C769221E03e661abBf043cceD84F1f",
      usdc: "0x4360a156F73663eee4581A4E8BFDbAB675F0A873",
      usdt: "0x55D7Af35752065C381Af13a5DcDA86e5Fe3f4045",
      idrx: "0x9B9D66405CDcAdbe5d1F300f67A1F89460e4C364",
      myrc: "0x2c3a47fdF42a795196C80FFf1775920e562284B4",
      phpc: "0xe5959e5C96348a2275A93630b34cB37571d6C2E7",
      tnsgd: "0xE26bAFF16B7c6119A05a3D65cf499DE321F67BAB",
      blockExplorer: "https://scope.klaytn.com",
    },
  },
];

// Default chain (Kaia Mainnet)
export const DEFAULT_CHAIN_ID = 8217;

// Get chain by ID
export function getChainById(chainId: number): Chain | undefined {
  return chains.find(chain => chain.id === chainId);
}

// Get default chain
export function getDefaultChain(): Chain {
  return getChainById(DEFAULT_CHAIN_ID) || chains[0];
}

// Get all chains
export function getAllChains(): Chain[] {
  return chains;
}

// Check if chain is supported
export function isChainSupported(chainId: number): boolean {
  return chains.some(chain => chain.id === chainId);
}
