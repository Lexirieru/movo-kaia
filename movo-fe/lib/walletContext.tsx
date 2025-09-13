"use client";

import { logout, loginWithWallet } from "@/app/api/api";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useAccount, useDisconnect, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { useRouter } from "next/navigation";

interface WalletContextType {
  isConnected: boolean;
  address: string | undefined;
  isConnecting: boolean;
  isLoading: boolean;
  isWalletSyncing: boolean; // NEW: Track ketika wallet sedang sync dengan backend
  disconnect: () => void;
  connectWallet: () => Promise<void>;
  getCurrentWalletAddress: () => Promise<string | null>;
  walletAddress: string;
  isWalletConnected: boolean;
  setRefreshUserCallback: (callback: () => Promise<void>) => void; // NEW: Callback untuk refresh user
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { address, isConnected, isConnecting } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect } = useConnect();
  const [isLoading, setIsLoading] = useState(true);
  const [isWalletSyncing, setIsWalletSyncing] = useState(false); // NEW: Track sync status
  const [prevAddress, setPrevAddress] = useState<string | undefined>(undefined);
  const [refreshUserCallback, setRefreshUserCallback] = useState<
    (() => Promise<void>) | null
  >(null); // NEW: Callback reference
  const router = useRouter();
  useEffect(() => {
    // Check for existing connection on mount
    const checkConnection = async () => {
      if (typeof window.ethereum !== "undefined") {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });
        } catch (error) {
          console.error("Error checking accounts:", error);
        }
      }

      // Reduce loading time
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500);

      return () => clearTimeout(timer);
    };

    checkConnection();
  }, []);

  // Auto-login ketika wallet terconnect dan address berubah
  useEffect(() => {
    const handleWalletConnection = async () => {
      // Cek jika wallet baru saja terconnect (address berubah dari undefined ke ada value)
      if (isConnected && address && address !== prevAddress) {
        console.log("🔗 New wallet connected:", address);
        setIsWalletSyncing(true); // NEW: Set syncing state

        try {
          console.log("🚀 Attempting auto-login with wallet...");
          const response = await loginWithWallet(address);
          console.log(response);
          if (response && response.statusCode === 200) {
            console.log("✅ Auto-login successful");
            // Refresh user data jika callback tersedia
            if (refreshUserCallback) {
              await refreshUserCallback();
            }
            // Tunggu sebentar untuk memastikan backend sudah update
            await new Promise((resolve) => setTimeout(resolve, 500));
          } else if (response.statusCode === 404 && response.redirect) {
            console.log("⚠️ Auto-login failed:", response);
            router.push(response.redirect);
          }
        } catch (error: any) {
          console.error("❌ Auto-login error:", error);
          // Backend akan handle redirect, jadi tidak perlu handle di sini
        }

        // Update previous address
        setPrevAddress(address);
        setIsWalletSyncing(false); // NEW: Clear syncing state
      } else if (!isConnected && prevAddress) {
        // Wallet disconnected
        setPrevAddress(undefined);
        setIsWalletSyncing(false); // NEW: Clear syncing state
      }
    };

    handleWalletConnection();
  }, [isConnected, address, prevAddress, router]);

  // Function to connect wallet
  const connectWallet = async (): Promise<void> => {
    try {
      console.log("🔌 Attempting to connect wallet...");

      if (typeof window.ethereum !== "undefined") {
        // Use wagmi connect function with injected connector (MetaMask)
        connect({ connector: injected() });
        // Note: Auto-login akan terjadi di useEffect di atas setelah connect berhasil
      } else {
        throw new Error("Please install MetaMask to connect your wallet");
      }
    } catch (error: any) {
      console.error("❌ Error connecting wallet:", error);
      throw error;
    }
  };

  // Function to get current wallet address
  const getCurrentWalletAddress = async (): Promise<string | null> => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });
        if (accounts.length > 0) {
          console.log("💰 Current wallet address:", accounts[0]);
          return accounts[0];
        }
      } catch (error) {
        console.error("Error getting wallet address:", error);
      }
    }
    return null;
  };

  // Listen for account changes in MetaMask
  useEffect(() => {
    if (typeof window.ethereum !== "undefined") {
      const handleAccountsChanged = async (accounts: string[]) => {
        console.log("🔄 MetaMask accounts changed:", accounts);

        if (accounts.length === 0) {
          console.log("🚪 User disconnected wallet from MetaMask");

          try {
            // Logout sebelum disconnect
            await logout();
            console.log("✅ Logout API called successfully");
          } catch (error) {
            console.error("❌ Error during logout:", error);
          }

          // Always disconnect wagmi regardless of logout success/failure
          disconnect();
          setPrevAddress(undefined);
        } else if (accounts[0] !== prevAddress) {
          // Account switched - akan trigger auto-login di useEffect di atas
          console.log("🔄 Account switched to:", accounts[0]);
        }
      };

      const handleChainChanged = (chainId: string) => {
        console.log("⛓️ Chain changed:", chainId);
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged,
        );
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, [disconnect, prevAddress]);

  const value: WalletContextType = {
    isConnected,
    address,
    isConnecting,
    isLoading,
    isWalletSyncing, // NEW: Add syncing state
    disconnect,
    connectWallet,
    getCurrentWalletAddress,
    setRefreshUserCallback: (callback: () => Promise<void>) =>
      setRefreshUserCallback(() => callback), // NEW: Set callback
    // Aliases for backward compatibility
    walletAddress: address || "",
    isWalletConnected: isConnected,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within WalletProvider");
  }

  return context;
}
