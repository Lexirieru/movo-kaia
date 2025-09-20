// Smart Contract Configuration
export const CONTRACT_CONFIG = {
  // Base Network (Chain ID: 84532)
  base: {
    // Escrow Contracts
    escrow: "0x306408Aca69417e44154E51f41CbFdE9Cb8FD142", // For USDT and USDC
    escrowIDRX: "0x54C99B5800eC0aD6F39C7C19e001BA73eE21314a", // For IDRX

    // Token Contracts
    mockUSDC: "0xf9D5a610fe990bfCdF7dd9FD64bdfe89D6D1eb4c",
    mockIDRX: "0x77fEa84656B5EF40BF33e3835A9921dAEAadb976",
    mockUSDT: "0x80327544e61e391304ad16f0BAFb2C5c7A76dfB3",

    // Network Info
    chainId: 84532,
    chainName: "Base Sepolia",
    blockExplorer: "https://sepolia.basescan.org",
    rpcUrl: "https://sepolia.base.org",
  },
  // Kaia Network (untuk masa depan jika diperlukan)
  kaia: {
    // Escrow Contracts
    escrow: "0x306408Aca69417e44154E51f41CbFdE9Cb8FD142", // Placeholder
    escrowIDRX: "0x54C99B5800eC0aD6F39C7C19e001BA73eE21314a", // Placeholder

    // Token Contracts
    mockIDRX: "0x77fEa84656B5EF40BF33e3835A9921dAEAadb976", // Placeholder

    // Network Info
    chainId: 1001, // Kaia Testnet
    chainName: "Kaia Testnet",
    blockExplorer: "https://baobab.klaytnscope.com",
    rpcUrl: "https://public-en-baobab.klaytn.net",
  },
};

// Type definitions for better type safety
export type TokenTypeExtended = "USDC" | "USDT" | "IDRX_KAIA" | "IDRX_BASE";
export type NetworkType = "base" | "kaia";
export type SimpleTokenType = "USDC" | "USDT" | "IDRX";

// Helper function to determine network from context or chain ID
export const getCurrentNetwork = (): NetworkType => {
  // Untuk saat ini, default ke base network
  // Nanti bisa ditambahkan logic untuk detect chain ID dari wallet
  return "base";
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
      return tokenType;
    case "IDRX":
      // Tentukan apakah IDRX_BASE atau IDRX_KAIA berdasarkan network
      return currentNetwork === "kaia" ? "IDRX_KAIA" : "IDRX_BASE";
    default:
      throw new Error(`Unsupported token type: ${tokenType}`);
  }
};

// Helper function to get network-specific contract address
export const getContractAddress = (
  type: "escrow" | "escrowIDRX" | "mockUSDC" | "mockIDRX" | "mockUSDT",
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
    case "IDRX_BASE":
    case "IDRX_KAIA":
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
    case "IDRX_KAIA":
    case "IDRX_BASE":
      return getContractAddress("mockIDRX", currentNetwork);
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
  // Normalize token type untuk handling
  const normalizedType = tokenType.startsWith("IDRX")
    ? "IDRX"
    : (tokenType as SimpleTokenType);

  switch (normalizedType) {
    case "USDC":
      return 6;
    case "USDT":
      return 6;
    case "IDRX":
      return 2; // IDRX has 2 decimals (both BASE and KAIA)
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

  const network = preferredNetwork || getCurrentNetwork();
  return network === "kaia" ? "IDRX_KAIA" : "IDRX_BASE";
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
        isBase: info.tokenType === "IDRX_BASE",
        isKaia: info.tokenType === "IDRX_KAIA",
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
