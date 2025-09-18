import { Token } from "@/types";

export const tokens: Token[] = [
  {
    name: "Mock USD Coin",
    symbol: "USDC",
    logo: "/token/USDC-Base.png",
    decimals: 6,
    addresses: {
      84532: "0xf9D5a610fe990bfCdF7dd9FD64bdfe89D6D1eb4c", // Base Sepolia
    },
  },
  {
    name: "Mock Tether USD",
    symbol: "USDT",
    logo: "/token/Tether-Base.png",
    decimals: 6,
    addresses: {
      84532: "0x80327544e61e391304ad16f0BAFb2C5c7A76dfB3", // Base Sepolia
    },
  },
  {
    name: "Mock IDRX Token",
    symbol: "IDRX",
    logo: "/token/IDRX-Base.png",
    decimals: 18,
    addresses: {
      84532: "0x77fEa84656B5EF40BF33e3835A9921dAEAadb976", // Base Sepolia
    },
  },
  {
    name: "Ether",
    symbol: "ETH",
    logo: "/token/eth-logo.svg",
    decimals: 18,
    addresses: {
      84532: "0x0000000000000000000000000000000000000000", // Base Sepolia (native)
    },
  },
  {
    name: "Wrapped Ether",
    symbol: "WETH",
    logo: "/token/weth-logo.svg",
    decimals: 18,
    addresses: {
      84532: "0x4200000000000000000000000000000000000006", // Base Sepolia
    },
  },
];

// Helper function to get token by symbol
export function getTokenBySymbol(symbol: string): Token | undefined {
  return tokens.find(token => token.symbol === symbol);
}

// Helper function to get token by symbol and chain
export function getTokenBySymbolAndChain(symbol: string, chainId: number): Token | undefined {
  const token = getTokenBySymbol(symbol);
  if (token && token.addresses[chainId]) {
    return token;
  }
  return undefined;
}

// Helper function to get token address by symbol and chain
export function getTokenAddress(symbol: string, chainId: number): string | undefined {
  const token = getTokenBySymbolAndChain(symbol, chainId);
  return token?.addresses[chainId];
}

// Get all tokens for a specific chain
export function getTokensForChain(chainId: number): Token[] {
  return tokens.filter(token => token.addresses[chainId]);
}

// Get supported tokens for current chain
export function getSupportedTokens(chainId: number): Token[] {
  return tokens.filter(token => 
    token.addresses[chainId] && 
    token.addresses[chainId] !== "0x0000000000000000000000000000000000000000"
  );
}
