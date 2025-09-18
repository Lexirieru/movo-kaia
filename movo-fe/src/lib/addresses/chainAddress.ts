import { Chain } from "@/types";

export const chains: Chain[] = [
  {
    id: 84532, // Base Sepolia
    name: "Base Sepolia",
    logo: "/chain/base-logo.svg",
    rpcUrl: "https://sepolia.base.org",
    blockExplorer: "https://sepolia.basescan.org",
    contracts: {
      escrow: "0xFF2A27508d77cd00A810d6B29e5158Fb44a4c74d",
      escrowIdrx: "0x764C9F2FAAC26C2dF7Af8B370c43259Bc476Dee1",
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
