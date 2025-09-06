// Smart Contract Configuration
export const CONTRACT_CONFIG = {
  // Base Network (Chain ID: 84532)
  base: {
    // Escrow Contracts
    escrowUSDC: '0xdFF19AA281E27C874C98416eFc22Bfe8eC2564b5',
    escrowIDRX: '0x8C95Cd28E414fe4F4DeCCd3A4601f8b154ff05A1',
    
    // Token Contracts
    mockUSDC: '0x7c1674812f7AB1bbaDAf80046f0b7C6b85E03aE3',
    mockIDRX: '0x29Fc20a600B2392b8b659CBD47eAcA44F9Fb71B0',
    
    // Network Info
    chainId: 84532,
    chainName: 'Base Sepolia',
    blockExplorer: 'https://sepolia.basescan.org',
    rpcUrl: 'https://sepolia.base.org'
  }
};

// Get contract address by type
export const getContractAddress = (type: 'escrowUSDC' | 'escrowIDRX' | 'mockUSDC' | 'mockIDRX') => {
  return CONTRACT_CONFIG.base[type];
};

// Get escrow address by token type
export const getEscrowAddress = (tokenType: 'USDC' | 'IDRX') => {
  return tokenType === 'USDC' ? CONTRACT_CONFIG.base.escrowUSDC : CONTRACT_CONFIG.base.escrowIDRX;
};

// Get token address by token type
export const getTokenAddress = (tokenType: 'USDC' | 'IDRX') => {
  return tokenType === 'USDC' ? CONTRACT_CONFIG.base.mockUSDC : CONTRACT_CONFIG.base.mockIDRX;
};
