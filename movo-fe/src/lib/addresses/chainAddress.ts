import { Chain } from "@/types";

export const chains: Chain[] = [
  {
    id: 84532, // Base Sepolia
    name: "Base Sepolia",
    logo: "/chain/base-logo.svg",
    rpcUrl: "https://sepolia.base.org",
    blockExplorer: "https://sepolia.basescan.org",
    contracts: {
      escrow: "0x306408Aca69417e44154E51f41CbFdE9Cb8FD142",
      escrowIdrx: "0x54C99B5800eC0aD6F39C7C19e001BA73eE21314a",
      usdc: "0xf9D5a610fe990bfCdF7dd9FD64bdfe89D6D1eb4c",
      usdt: "0x80327544e61e391304ad16f0BAFb2C5c7A76dfB3",
      idrx: "0x77fEa84656B5EF40BF33e3835A9921dAEAadb976",
      blockExplorer: "https://sepolia.basescan.org",
    },
  },
];

// Default chain (Base Sepolia for development)
export const DEFAULT_CHAIN_ID = 84532;

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
