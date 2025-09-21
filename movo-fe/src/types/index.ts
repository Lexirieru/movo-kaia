import { Address } from "viem";
import React from "react";

/**
 * Token interface representing a cryptocurrency token
 */
export interface Token {
  /** Full name of the token (e.g., "Wrapped Ether") */
  name: string;
  /** Symbol of the token (e.g., "WETH") */
  symbol: string;
  /** URL or path to the token logo image */
  logo: string;
  /** Number of decimal places for the token */
  decimals: number;
  /** Contract addresses for different chains */
  addresses: {
    [chainId: number]: Address;
  };
}

/**
 * Chain interface representing a blockchain network
 */
export interface Chain {
  /** Unique chain identifier */
  id: number;
  /** Human-readable chain name */
  name: string;
  /** URL or path to the chain logo image */
  logo: string;
  /** RPC endpoint for the chain */
  rpcUrl?: string;
  /** Block explorer URL */
  blockExplorer?: string;
  /** Smart contract addresses for this chain */
  contracts: {
    escrow?: string;
    escrowIdrx?: string;
    usdc?: string;
    usdt?: string;
    idrx?: string;
    myrc?: string;
    phpc?: string;
    tnsgd?: string;
    blockExplorer: string;
  };
}

/**
 * Escrow contract interface
 */
export interface EscrowContract {
  /** Escrow contract address */
  address: string;
  /** Contract ABI */
  abi: any[];
  /** Chain ID where this contract is deployed */
  chainId: number;
}

/**
 * Transaction status types
 */
export type TransactionStatus = 'idle' | 'pending' | 'confirming' | 'success' | 'error';

/**
 * Common component props for reusable components
 */
export interface BaseComponentProps {
  /** Additional CSS classes */
  className?: string;
  /** Children elements */
  children?: React.ReactNode;
}

/**
 * Props for components that handle token selection
 */
export interface TokenSelectionProps {
  /** Currently selected token */
  selectedToken?: Token;
  /** Callback when token is selected */
  onTokenSelect: (token: Token) => void;
  /** Other token to exclude from selection */
  otherToken?: Token;
  /** Placeholder text for the selector */
  label?: string;
}

// Re-export existing types
export * from './historyTemplate';
export * from './receiverInGroupTemplate';
