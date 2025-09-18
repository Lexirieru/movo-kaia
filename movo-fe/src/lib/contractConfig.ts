// Smart Contract Configuration
export const CONTRACT_CONFIG = {
  // Base Network (Chain ID: 84532)
  base: {
    // Escrow Contracts
    escrow: '0xFF2A27508d77cd00A810d6B29e5158Fb44a4c74d', // For USDT and USDC
    escrowIDRX: '0x764C9F2FAAC26C2dF7Af8B370c43259Bc476Dee1', // For IDRX
    
    // Token Contracts
    mockUSDC: '0xf9D5a610fe990bfCdF7dd9FD64bdfe89D6D1eb4c',
    mockIDRX: '0x77fEa84656B5EF40BF33e3835A9921dAEAadb976',
    mockUSDT: '0x80327544e61e391304ad16f0BAFb2C5c7A76dfB3',
    
    // Network Info
    chainId: 84532,
    chainName: 'Base Sepolia',
    blockExplorer: 'https://sepolia.basescan.org',
    rpcUrl: 'https://sepolia.base.org'
  }
};

// Get contract address by type
export const getContractAddress = (type: 'escrow' | 'escrowIDRX' | 'mockUSDC' | 'mockIDRX' | 'mockUSDT') => {
  return CONTRACT_CONFIG.base[type];
};

// Get escrow address by token type
export const getEscrowAddress = (tokenType: 'USDC' | 'USDT' | 'IDRX') => {
  return tokenType === 'IDRX' ? CONTRACT_CONFIG.base.escrowIDRX : CONTRACT_CONFIG.base.escrow;
};

// Get token address by token type
export const getTokenAddress = (tokenType: 'USDC' | 'USDT' | 'IDRX') => {
  switch (tokenType) {
    case 'USDC':
      return CONTRACT_CONFIG.base.mockUSDC;
    case 'USDT':
      return CONTRACT_CONFIG.base.mockUSDT;
    case 'IDRX':
      return CONTRACT_CONFIG.base.mockIDRX;
    default:
      throw new Error(`Unsupported token type: ${tokenType}`);
  }
};
