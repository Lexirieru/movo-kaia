"use client";

import { RefreshCw, AlertCircle } from "lucide-react";

interface TokenBalanceCardProps {
  symbol: string;
  name: string;
  balance: string;
  formattedBalance: string;
  loading?: boolean;
  decimals: number;
}

export default function TokenBalanceCard({
  symbol,
  name,
  balance,
  formattedBalance,
  loading = false,
  decimals,
}: TokenBalanceCardProps) {
  const formatDisplayBalance = (
    balance: string,
    symbol: string,
    decimals: number,
  ) => {
    const num = parseFloat(balance);
    if (num === 0) return "0";

    // For IDRX with 6 decimals, handle formatting appropriately
    if (symbol === "IDRX" && decimals === 6) {
      if (num < 0.000001) return num.toFixed(6).replace(/\.?0+$/, "");
      if (num < 0.01) return num.toFixed(6).replace(/\.?0+$/, "");
      if (num < 1) return num.toFixed(4).replace(/\.?0+$/, "");
      if (num < 100) return num.toFixed(2).replace(/\.?0+$/, "");
      return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }

    // For other tokens, use standard formatting
    if (num < 0.000001) return num.toFixed(6).replace(/\.?0+$/, "");
    if (num < 0.01) return num.toFixed(6).replace(/\.?0+$/, "");
    if (num < 1) return num.toFixed(4).replace(/\.?0+$/, "");
    if (num < 100) return num.toFixed(2).replace(/\.?0+$/, "");
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400/20 to-blue-600/20 rounded-full flex items-center justify-center border border-cyan-500/30">
              <span className="text-cyan-400 font-bold text-sm">
                {symbol.charAt(0)}
              </span>
            </div>
            {loading && (
              <div className="absolute -top-1 -right-1">
                <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
              </div>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{symbol}</h3>
            <p className="text-sm text-gray-400">{name}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Balance</span>
          {loading ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-cyan-400 rounded-full animate-spin"></div>
              <span className="text-gray-400">Loading...</span>
            </div>
          ) : (
            <span className="text-xl font-bold text-cyan-400">
              {formatDisplayBalance(formattedBalance, symbol, decimals)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
