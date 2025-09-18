import { useReadContract, useReadContracts } from 'wagmi';
import { useCallback } from 'react';

// Hook untuk membaca data dari smart contract
export function useContractRead(contractConfig: {
  address: `0x${string}`;
  abi: any[];
  functionName: string;
  args?: any[];
  chainId?: number;
}) {
  const { data, error, isLoading, isSuccess, isError, refetch } = useReadContract({
    address: contractConfig.address,
    abi: contractConfig.abi,
    functionName: contractConfig.functionName,
    args: contractConfig.args,
    chainId: contractConfig.chainId,
  });

  return {
    data,
    error,
    isLoading,
    isSuccess,
    isError,
    refetch,
  };
}

// Hook untuk membaca multiple contract functions
export function useContractReads(contracts: Array<{
  address: `0x${string}`;
  abi: any[];
  functionName: string;
  args?: any[];
  chainId?: number;
}>) {
  const { data, error, isLoading, isSuccess, isError, refetch } = useReadContracts({
    contracts: contracts.map(contract => ({
      address: contract.address,
      abi: contract.abi,
      functionName: contract.functionName,
      args: contract.args,
      chainId: contract.chainId,
    })),
  });

  return {
    data,
    error,
    isLoading,
    isSuccess,
    isError,
    refetch,
  };
}

// Hook untuk membaca escrow contract data
export function useEscrowRead(escrowAddress: `0x${string}`, functionName: string, args?: any[]) {
  return useContractRead({
    address: escrowAddress,
    abi: [], // Will be imported from abis
    functionName,
    args,
  });
}

// Hook untuk membaca token balance
export function useTokenBalance(tokenAddress: `0x${string}`, userAddress?: `0x${string}`) {
  return useContractRead({
    address: tokenAddress,
    abi: [], // ERC20 ABI
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
  });
}

// Hook untuk membaca token allowance
export function useTokenAllowance(
  tokenAddress: `0x${string}`, 
  ownerAddress?: `0x${string}`, 
  spenderAddress?: `0x${string}`
) {
  return useContractRead({
    address: tokenAddress,
    abi: [], // ERC20 ABI
    functionName: 'allowance',
    args: ownerAddress && spenderAddress ? [ownerAddress, spenderAddress] : undefined,
  });
}

// Hook untuk membaca escrow details
export function useEscrowDetails(escrowId: string) {
  return useContractRead({
    address: '0xFF2A27508d77cd00A810d6B29e5158Fb44a4c74d', // Escrow contract address
    abi: [], // Escrow ABI
    functionName: 'getEscrowDetails',
    args: [escrowId],
  });
}

// Hook untuk membaca semua escrows dari user
export function useUserEscrows(userAddress?: `0x${string}`) {
  return useContractRead({
    address: '0xFF2A27508d77cd00A810d6B29e5158Fb44a4c74d', // Escrow contract address
    abi: [], // Escrow ABI
    functionName: 'getUserEscrows',
    args: userAddress ? [userAddress] : undefined,
  });
}

// Hook untuk membaca contract events
export function useContractEvents(contractConfig: {
  address: `0x${string}`;
  abi: any[];
  eventName: string;
  fromBlock?: bigint;
  toBlock?: bigint;
  args?: any[];
}) {
  // This would typically use useWatchContractEvent or similar
  // For now, we'll return a placeholder
  return {
    data: null,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
    refetch: () => {},
  };
}
