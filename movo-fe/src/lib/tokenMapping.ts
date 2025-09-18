import { tokens } from './addresses/tokenAddress';

// Create token address mapping from existing token data
export const TOKEN_ADDRESSES = tokens.reduce((acc, token) => {
  Object.values(token.addresses).forEach(address => {
    if (address && address !== "0x0000000000000000000000000000000000000000") {
      acc[address.toLowerCase()] = token.symbol;
    }
  });
  return acc;
}, {} as Record<string, string>);

export type TokenType = 'USDC' | 'USDT' | 'IDRX' | 'ETH' | 'WETH';

/**
 * Mendapatkan token type berdasarkan token address
 * @param tokenAddress - Address token dari smart contract
 * @returns Token type (USDC, USDT, IDRX, ETH, WETH) atau 'UNKNOWN' jika tidak ditemukan
 */
export function getTokenType(tokenAddress: string): TokenType | 'UNKNOWN' {
  if (!tokenAddress) return 'UNKNOWN';
  
  const normalizedAddress = tokenAddress.toLowerCase();
  const tokenSymbol = TOKEN_ADDRESSES[normalizedAddress];
  return (tokenSymbol as TokenType) || 'UNKNOWN';
}

/**
 * Mendapatkan token icon berdasarkan token type
 * @param tokenType - Token type (USDC, USDT, IDRX, ETH, WETH)
 * @returns Path ke icon token
 */
export function getTokenIcon(tokenType: TokenType | 'UNKNOWN'): string {
  const token = tokens.find(t => t.symbol === tokenType);
  return token?.logo || '/USDC-Base.png'; // Default fallback
}

/**
 * Mendapatkan token decimals berdasarkan token type
 * @param tokenType - Token type (USDC, USDT, IDRX, ETH, WETH)
 * @returns Number of decimals
 */
export function getTokenDecimals(tokenType: TokenType | 'UNKNOWN'): number {
  const token = tokens.find(t => t.symbol === tokenType);
  return token?.decimals || 6; // Default fallback
}

/**
 * Format amount berdasarkan token type dan decimals
 * @param amount - Raw amount string
 * @param tokenType - Token type (USDC, USDT, IDRX, ETH, WETH)
 * @returns Formatted amount string
 */
export function formatTokenAmount(amount: string, tokenType: TokenType | 'UNKNOWN'): string {
  const decimals = getTokenDecimals(tokenType);
  const numericAmount = parseFloat(amount) / Math.pow(10, decimals);
  return numericAmount.toFixed(2);
}
