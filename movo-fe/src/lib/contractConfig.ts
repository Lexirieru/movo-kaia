// Smart Contract Configuration
export const CONTRACT_CONFIG = {
  // Kaia Mainnet (Chain ID: 8217)
  kaia: {
    // Escrow Contracts
    escrow: "0x0d837aD954F4f9F06E303A86150ad0F322Ec5EB1", // For USDC and USDT
    escrowIDRX: "0x4ce1D1E0e9C769221E03e661abBf043cceD84F1f", // For IDRX

    // Token Contracts
    mockUSDC: "0x4360a156F73663eee4581A4E8BFDbAB675F0A873", // 6 decimals
    mockUSDT: "0x55D7Af35752065C381Af13a5DcDA86e5Fe3f4045", // 6 decimals
    mockIDRX: "0x9B9D66405CDcAdbe5d1F300f67A1F89460e4C364", // 6 decimals
    mockMYRC: "0x2c3a47fdF42a795196C80FFf1775920e562284B4", // 18 decimals
    mockPHPC: "0xe5959e5C96348a2275A93630b34cB37571d6C2E7", // 6 decimals
    mockTNSGD: "0xE26bAFF16B7c6119A05a3D65cf499DE321F67BAB", // 6 decimals

    // Network Info
    chainId: 8217,
    chainName: "Kaia Mainnet",
    blockExplorer: "https://scope.klaytn.com",
    rpcUrl: "https://klaytn.drpc.org",
  },
};

// Type definitions for better type safety
export type TokenTypeExtended = "USDC" | "USDT" | "IDRX" | "MYRC" | "PHPC" | "TNSGD";
export type NetworkType = "kaia";
export type SimpleTokenType = "USDC" | "USDT" | "IDRX" | "MYRC" | "PHPC" | "TNSGD";

// Helper function to determine network from context or chain ID
export const getCurrentNetwork = (): NetworkType => {
  // Default to Kaia mainnet
  return "kaia";
};

// Helper function to convert simple token type to extended token type
export const resolveTokenType = (
  tokenType: SimpleTokenType,
  network?: NetworkType,
): TokenTypeExtended => {
  const currentNetwork = network || getCurrentNetwork();

  switch (tokenType) {
    case "USDC":
    case "USDT":
    case "IDRX":
    case "MYRC":
    case "PHPC":
    case "TNSGD":
      return tokenType;
    default:
      throw new Error(`Unsupported token type: ${tokenType}`);
  }
};

// Helper function to get network-specific contract address
export const getContractAddress = (
  type: "escrow" | "escrowIDRX" | "mockUSDC" | "mockIDRX" | "mockUSDT" | "mockMYRC" | "mockPHPC" | "mockTNSGD",
  network?: NetworkType,
) => {
  const currentNetwork = network || getCurrentNetwork();
  const config = CONTRACT_CONFIG[currentNetwork] as any;

  if (!config || !config[type]) {
    throw new Error(`Contract ${type} not found for network ${currentNetwork}`);
  }

  return config[type] as string;
};

// Get escrow address by token type (with automatic network detection)
export const getEscrowAddress = (
  tokenType: TokenTypeExtended,
  network?: NetworkType,
) => {
  const currentNetwork = network || getCurrentNetwork();

  switch (tokenType) {
    case "USDC":
    case "USDT":
      return getContractAddress("escrow", currentNetwork);
    case "IDRX":
    case "MYRC":
    case "PHPC":
    case "TNSGD":
      return getContractAddress("escrowIDRX", currentNetwork);
    default:
      throw new Error(`Unsupported token type: ${tokenType}`);
  }
};

// Overloaded function untuk backward compatibility dengan SimpleTokenType
export const getEscrowAddressSimple = (
  tokenType: SimpleTokenType,
  network?: NetworkType,
) => {
  const resolvedTokenType = resolveTokenType(tokenType, network);
  return getEscrowAddress(resolvedTokenType, network);
};

// Get token address by token type (with automatic network detection)
export const getTokenAddress = (
  tokenType: TokenTypeExtended,
  network?: NetworkType,
) => {
  const currentNetwork = network || getCurrentNetwork();

  switch (tokenType) {
    case "USDC":
      return getContractAddress("mockUSDC", currentNetwork);
    case "USDT":
      return getContractAddress("mockUSDT", currentNetwork);
    case "IDRX":
      return getContractAddress("mockIDRX", currentNetwork);
    case "MYRC":
      return getContractAddress("mockMYRC", currentNetwork);
    case "PHPC":
      return getContractAddress("mockPHPC", currentNetwork);
    case "TNSGD":
      return getContractAddress("mockTNSGD", currentNetwork);
    default:
      throw new Error(`Unsupported token type: ${tokenType}`);
  }
};

// Overloaded function untuk backward compatibility dengan SimpleTokenType
export const getTokenAddressSimple = (
  tokenType: SimpleTokenType,
  network?: NetworkType,
) => {
  const resolvedTokenType = resolveTokenType(tokenType, network);
  return getTokenAddress(resolvedTokenType, network);
};

// Get token decimals by token type
export const getTokenDecimals = (
  tokenType: SimpleTokenType | TokenTypeExtended,
) => {
  switch (tokenType) {
    case "USDC":
      return 6;
    case "USDT":
      return 6;
    case "IDRX":
      return 6;
    case "MYRC":
      return 18;
    case "PHPC":
      return 6;
    case "TNSGD":
      return 6;
    default:
      throw new Error(`Unsupported token type: ${tokenType}`);
  }
};

// Helper function untuk validasi dan konversi IDRX type
export const validateAndResolveIDRXType = (
  tokenType: string,
  preferredNetwork?: NetworkType,
): TokenTypeExtended => {
  if (tokenType !== "IDRX") {
    return tokenType as TokenTypeExtended;
  }

  return "IDRX";
};

// Function untuk mendapatkan semua informasi token dalam satu call
export const getTokenInfo = (
  tokenType: SimpleTokenType,
  network?: NetworkType,
) => {
  const resolvedType = resolveTokenType(tokenType, network);
  const currentNetwork = network || getCurrentNetwork();

  return {
    tokenType: resolvedType,
    network: currentNetwork,
    address: getTokenAddress(resolvedType, currentNetwork),
    escrowAddress: getEscrowAddress(resolvedType, currentNetwork),
    decimals: getTokenDecimals(tokenType),
    isIDRX: tokenType === "IDRX",
    displayName:
      tokenType === "IDRX"
        ? `${tokenType}_${currentNetwork.toUpperCase()}`
        : tokenType,
  };
};

/* 
PANDUAN PENGGUNAAN:

1. Untuk penggunaan sederhana (otomatis detect network):
   const tokenInfo = getTokenInfo('IDRX'); // Akan resolve ke IDRX_BASE atau IDRX_KAIA

2. Untuk menggunakan network tertentu:
   const tokenInfo = getTokenInfo('IDRX', 'kaia'); // Paksa menggunakan IDRX_KAIA
   const tokenInfo = getTokenInfo('IDRX', 'base'); // Paksa menggunakan IDRX_BASE

3. Untuk mendapatkan address secara langsung:
   const tokenAddress = getTokenAddressSimple('IDRX'); // Otomatis resolve
   const escrowAddress = getEscrowAddressSimple('IDRX'); // Otomatis resolve

4. Untuk penggunaan advanced dengan type yang eksplisit:
   const tokenAddress = getTokenAddress('IDRX_BASE');
   const escrowAddress = getEscrowAddress('IDRX_KAIA');

CONTOH IMPLEMENTASI DI COMPONENT:
```typescript
// Di dalam component
const handleTokenOperation = (tokenType: 'USDC' | 'USDT' | 'IDRX') => {
  const tokenInfo = getTokenInfo(tokenType);
  
  console.log('Token Type:', tokenInfo.tokenType); // IDRX_BASE atau IDRX_KAIA
  console.log('Network:', tokenInfo.network); // base atau kaia
  console.log('Token Address:', tokenInfo.address);
  console.log('Escrow Address:', tokenInfo.escrowAddress);
  console.log('Display Name:', tokenInfo.displayName); // IDRX_BASE atau IDRX_KAIA
};
```
*/

// Example helper function untuk component yang perlu menangani IDRX
export const createTokenHandler = (preferredNetwork?: NetworkType) => {
  return {
    // Method untuk menggunakan token dengan auto-resolution
    useToken: (tokenType: SimpleTokenType) => {
      const info = getTokenInfo(tokenType, preferredNetwork);
      return {
        ...info,
        // Helper methods
        isIDRX: info.tokenType === "IDRX",
        isStablecoin: ["USDC", "USDT"].includes(tokenType),
      };
    },

    // Method untuk switch network context
    switchNetwork: (newNetwork: NetworkType) => {
      return createTokenHandler(newNetwork);
    },

    // Method untuk validasi token support
    isTokenSupported: (tokenType: string): tokenType is SimpleTokenType => {
      return ["USDC", "USDT", "IDRX"].includes(tokenType);
    },
  };
};
