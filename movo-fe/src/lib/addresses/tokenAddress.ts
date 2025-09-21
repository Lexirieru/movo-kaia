import { Token } from "@/types";

export const tokens: Token[] = [
  {
    name: "Mock USD Coin",
    symbol: "USDC",
    logo: "/token/USDC-Base.png",
    decimals: 6,
    addresses: {
      8217: "0x4360a156F73663eee4581A4E8BFDbAB675F0A873", // Kaia Mainnet
    },
  },
  {
    name: "Mock Tether USD",
    symbol: "USDT",
    logo: "/token/Tether-Base.png",
    decimals: 6,
    addresses: {
      8217: "0x55D7Af35752065C381Af13a5DcDA86e5Fe3f4045", // Kaia Mainnet
    },
  },
  {
    name: "Mock IDRX Token",
    symbol: "IDRX",
    logo: "/token/IDRX-Base.png",
    decimals: 6,
    addresses: {
      8217: "0x9B9D66405CDcAdbe5d1F300f67A1F89460e4C364", // Kaia Mainnet
    },
  },
  {
    name: "Mock MYRC Token",
    symbol: "MYRC",
    logo: "/token/MYRC-Kaia.png",
    decimals: 18,
    addresses: {
      8217: "0x2c3a47fdF42a795196C80FFf1775920e562284B4", // Kaia Mainnet
    },
  },
  {
    name: "Mock PHPC Token",
    symbol: "PHPC",
    logo: "/token/PHPC-Kaia.png",
    decimals: 6,
    addresses: {
      8217: "0xe5959e5C96348a2275A93630b34cB37571d6C2E7", // Kaia Mainnet
    },
  },
  {
    name: "Mock TNSGD Token",
    symbol: "TNSGD",
    logo: "/token/TNSGD-Kaia.png",
    decimals: 6,
    addresses: {
      8217: "0xE26bAFF16B7c6119A05a3D65cf499DE321F67BAB", // Kaia Mainnet
    },
  },
  {
    name: "Kaia",
    symbol: "KAIA",
    logo: "/token/kaia-logo.svg",
    decimals: 18,
    addresses: {
      8217: "0x0000000000000000000000000000000000000000", // Kaia Mainnet (native)
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
