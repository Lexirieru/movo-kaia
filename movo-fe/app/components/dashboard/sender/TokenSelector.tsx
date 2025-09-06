import { useState } from "react";
import { X, Search } from "lucide-react";

interface Token {
  address: string;
  symbol: string;
  name: string;
  icon: string;
  balance: number;
}

interface TokenSelectorProps {
  selectedToken: Token | null;
  onTokenSelect: (token: Token) => void;
  onClose: () => void;
}

//ini mock data buat token addressnya yaa
const AVAILABLE_TOKENS: Token[] = [
  {
    address: "0x1234...abcd",
    symbol: "IDRX",
    name: "Indonesian Rupiah Token",
    icon: "🇮🇩",
    balance: 1000,
  },
  {
    address: "0x5678...efgh",
    symbol: "USDC",
    name: "USD Coin",
    icon: "💵",
    balance: 500,
  },
  {
    address: "0x9abc...ijkl",
    symbol: "USDT",
    name: "Tether USD",
    icon: "💰",
    balance: 750,
  },
  {
    address: "0xdef0...mnop",
    symbol: "DAI",
    name: "Dai Stablecoin",
    icon: "🟡",
    balance: 300,
  },
  {
    address: "0x2468...qrst",
    symbol: "WETH",
    name: "Wrapped Ethereum",
    icon: "⚡",
    balance: 2.5,
  },
];

export default function TokenSelector({
  selectedToken,
  onTokenSelect,
  onClose,
}: TokenSelectorProps) {
  const [searchAddress, setSearchAddress] = useState("");
  const [filteredTokens, setFilteredTokens] = useState(AVAILABLE_TOKENS);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const handleAddressSearch = async () => {
    if (!searchAddress.trim()) return;

    setIsSearching(true);
    setSearchError("");

    try {
      //fetch token disini
      await new Promise((resolve) => setTimeout(resolve, 1500));

      //mock validation (cek jika address valid)
      if (!searchAddress.startsWith("0x") || searchAddress.length < 10) {
        setSearchError("Invalid token address format");
        setIsSearching(false);
        return;
      }

      //mock cek token udah ada
      const existingToken = AVAILABLE_TOKENS.find(
        (t) => t.address.toLowerCase() == searchAddress.toLowerCase(),
      );

      if (existingToken) {
        setFilteredTokens([
          existingToken,
          ...AVAILABLE_TOKENS.filter((t) => t != existingToken),
        ]);
      } else {
        // mock nambah token ke list
        const FoundToken: Token = {
          address: searchAddress,
          symbol: "Custom",
          name: "Mock Token",
          icon: " ",
          balance: Math.floor(Math.random() * 1000),
        };
        setFilteredTokens([FoundToken, ...AVAILABLE_TOKENS]);
      }
    } catch (err) {
      setSearchError("Failed to fetch token information");
    }
    setIsSearching(false);
  };

  const handleTokenFilter = (searchTerm: string) => {
    const filtered = AVAILABLE_TOKENS.filter(
      (token) =>
        token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        token.address.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    setFilteredTokens(filtered);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-white/10 p-6 w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white text-lg font-semibold">Select Token</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Token Address Input */}
        <div className="mb-4">
          <label className="text-white/80 text-sm mb-2 block">Search</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="0x..."
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              onKeyPress={(e) => e.key == "Enter" && handleAddressSearch()}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all"
            />
            <button
              onClick={handleAddressSearch}
              disabled={isSearching || !searchAddress.trim()}
              className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSearching ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Search className="w-5 h-5" />
              )}
            </button>
          </div>
          {searchError && (
            <p className="text-red-400 text-xs mt-1">{searchError}</p>
          )}
        </div>

        {/* Quick Filter */}
        <div className="mb-4">
          <label className="text-white/80 text-sm mb-2 block">
            Filter Available Tokens
          </label>
          <input
            type="text"
            placeholder="Search..."
            onChange={(e) => handleTokenFilter(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all"
          />
        </div>

        {/* Available Tokens */}
        <div className="flex-1 overflow-y-auto space-y-2">
          <label className="text-white/80 text-sm sticky top-0 bg-slate-900/90 py-2">
            Available Tokens
          </label>
          {filteredTokens.map((token) => (
            <button
              key={token.address}
              onClick={() => onTokenSelect(token)}
              className={`w-full p-3 rounded-xl border text-left transition-all hover:scale-[1.02] ${
                selectedToken?.address === token.address
                  ? "bg-cyan-500/20 border-cyan-500/50"
                  : "bg-white/5 hover:bg-white/10 border-white/10"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{token.icon}</span>
                  <div>
                    <div className="text-white font-medium">{token.symbol}</div>
                    <div className="text-gray-400 text-sm">{token.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white text-sm font-medium">
                    {token.balance < 1
                      ? token.balance.toFixed(4)
                      : token.balance.toLocaleString()}
                  </div>
                  <div className="text-gray-400 text-xs">
                    {token.address.slice(0, 10)}...
                  </div>
                </div>
              </div>
            </button>
          ))}

          {filteredTokens.length == 0 && (
            <div className="text-center py-8 text-gray-400">
              <p>No tokens found</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-white/10 mt-4">
          <button
            onClick={onClose}
            className="flex-1 bg-white/10 text-white py-3 rounded-xl hover:bg-white/20 transition-colors"
          >
            Cancel
          </button>
          {selectedToken && (
            <button
              onClick={() => onTokenSelect(selectedToken)}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all"
            >
              Select {selectedToken.symbol}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
