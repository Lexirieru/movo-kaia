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
  logo: string;
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
      logo: "/USDC-Base.png",
    },
    {
      symbol: "USDT", 
      name: "Mock Tether USD",
      decimals: 6,
      logo: "",
    },
    {
      symbol: "IDRX",
      name: "Mock IDRX Token", 
      decimals: 18,
      logo: "/IDRX-Base.png",
    },
  ];

  const fetchTokenBalance = async (token: typeof tokens[0]): Promise<TokenBalance> => {
    try {
      const tokenAddress = getTokenAddress(token.symbol, 84532); // Base Sepolia
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

      // For IDRX, try to read decimals from smart contract
      let actualDecimals = token.decimals;
      if (token.symbol === "IDRX") {
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
          console.log(`IDRX Contract Decimals:`, actualDecimals);
        } catch (error) {
          console.log(`Failed to read IDRX decimals from contract, using default:`, token.decimals);
        }
      }

      const formattedBalance = formatUnits(balance as bigint, actualDecimals);
      
      // Debug logging for IDRX
      if (token.symbol === "IDRX") {
        console.log(`IDRX Debug:`, {
          rawBalance: balance.toString(),
          configuredDecimals: token.decimals,
          actualDecimals,
          formattedBalance,
          balanceBigInt: balance,
          tokenAddress,
          calculation: `${balance.toString()} / 10^${actualDecimals} = ${formattedBalance}`
        });
      }
      
      return {
        symbol: token.symbol,
        name: token.name,
        balance: balance.toString(),
        formattedBalance,
        decimals: token.decimals,
        logo: token.logo,
      };
    } catch (error) {
      console.error(`Error fetching ${token.symbol} balance:`, error);
      return {
        symbol: token.symbol,
        name: token.name,
        balance: "0",
        formattedBalance: "0",
        decimals: token.decimals,
        logo: token.logo,
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
