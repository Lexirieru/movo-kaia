"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/lib/walletContext";
import { publicClient } from "@/lib/smartContract";
import { getTokenAddress } from "@/lib/addresses/tokenAddress";
import { formatUnits } from "viem";

interface TokenBalance {
  symbol: string;
  name: string;
  balance: string;
  formattedBalance: string;
  decimals: number;
}

export function useTokenBalances() {
  const { isConnected, address } = useWallet();
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tokens = [
    {
      symbol: "USDC",
      name: "Mock USD Coin",
      decimals: 6,
    },
    {
      symbol: "USDT", 
      name: "Mock Tether USD",
      decimals: 6,
    },
    {
      symbol: "IDRX",
      name: "Mock IDRX Token", 
      decimals: 6,
    },
    {
      symbol: "MYRC",
      name: "Mock MYRC Token",
      decimals: 18,
    },
    {
      symbol: "PHPC",
      name: "Mock PHPC Token",
      decimals: 6,
    },
    {
      symbol: "TNSGD",
      name: "Mock TNSGD Token",
      decimals: 6,
    },
  ];

  const fetchTokenBalance = async (token: typeof tokens[0]): Promise<TokenBalance> => {
    try {
      const tokenAddress = getTokenAddress(token.symbol, 8217); // Kaia Mainnet
      if (!tokenAddress) {
        throw new Error(`Token address not found for ${token.symbol}`);
      }

      const balance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: [
          {
            inputs: [{ internalType: "address", name: "account", type: "address" }],
            name: "balanceOf",
            outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
            stateMutability: "view",
            type: "function",
          },
        ],
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      });

      // Try to read decimals from smart contract for all tokens
      let actualDecimals = token.decimals;
      try {
        const contractDecimals = await publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: [
            {
              inputs: [],
              name: "decimals",
              outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
              stateMutability: "view",
              type: "function",
            },
          ],
          functionName: "decimals",
        });
        actualDecimals = Number(contractDecimals);
        console.log(`${token.symbol} Contract Decimals:`, actualDecimals);
      } catch (error) {
        console.log(`Failed to read ${token.symbol} decimals from contract, using default:`, token.decimals);
      }

      const formattedBalance = formatUnits(balance as bigint, actualDecimals);
      
      // Debug logging for all tokens
      console.log(`${token.symbol} Debug:`, {
        rawBalance: balance.toString(),
        configuredDecimals: token.decimals,
        actualDecimals,
        formattedBalance,
        balanceBigInt: balance,
        tokenAddress,
        calculation: `${balance.toString()} / 10^${actualDecimals} = ${formattedBalance}`
      });
      
      return {
        symbol: token.symbol,
        name: token.name,
        balance: balance.toString(),
        formattedBalance,
        decimals: token.decimals,
      };
    } catch (error) {
      console.error(`Error fetching ${token.symbol} balance:`, error);
      return {
        symbol: token.symbol,
        name: token.name,
        balance: "0",
        formattedBalance: "0",
        decimals: token.decimals,
      };
    }
  };

  const fetchAllBalances = async () => {
    if (!isConnected || !address) {
      setBalances([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const balancePromises = tokens.map(token => fetchTokenBalance(token));
      const tokenBalances = await Promise.all(balancePromises);
      setBalances(tokenBalances);
    } catch (error) {
      console.error("Error fetching token balances:", error);
      setError("Failed to fetch token balances");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllBalances();
  }, [isConnected, address]);

  return {
    balances,
    loading,
    error,
    refetch: fetchAllBalances,
  };
}
