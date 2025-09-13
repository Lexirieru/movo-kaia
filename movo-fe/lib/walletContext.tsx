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
  isWalletSyncing: boolean; // wallet sync sama backend
  disconnect: () => void;
  connectWallet: () => Promise<void>;
  walletAddress: string;
  isWalletConnected: boolean;
  setRefreshUserCallback: (callback: () => Promise<void>) => void; // callaback untuk refresh user
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { address, isConnected, isConnecting } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect } = useConnect();
  const [isLoading, setIsLoading] = useState(true);
  const [isWalletSyncing, setIsWalletSyncing] = useState(false);
  const [prevAddress, setPrevAddress] = useState<string | undefined>(undefined);
  const [refreshUserCallback, setRefreshUserCallback] = useState<
    (() => Promise<void>) | null
  >(null);
  const [isInitialized, setIsInitialized] = useState(false); // NEW: Track jika sudah initialized
  const [processedAddresses, setProcessedAddresses] = useState<Set<string>>(
    new Set(),
  ); // NEW: Track processed addresses
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

        // Set initial prevAddress untuk prevent first-load login
        if (address && isConnected) {
          console.log(
            "🔄 Setting initial prevAddress to prevent duplicate login:",
            address,
          );
          setPrevAddress(address);
        }

        setIsInitialized(true); // Mark as initialized setelah loading selesai
      }, 500);

      return () => clearTimeout(timer);
    };

    checkConnection();
  }, [address, isConnected]); // Add dependencies

  // Auto-login ketika wallet terconnect dan address berubah
  useEffect(() => {
    const handleWalletConnection = async () => {
      if (!isInitialized) {
        return;
      }

      if (isWalletSyncing) {
        return;
      }

      // KONDISI LOGIN: Wallet terconnect dan address ada
      if (isConnected && address) {
        // PENGECEKAN 3: Cek jika address sudah pernah diproses
        if (processedAddresses.has(address.toLowerCase())) {
          // Update prevAddress jika belum di-set
          if (prevAddress !== address) {
            setPrevAddress(address);
          }
          return;
        }

        // KONDISI untuk LOGIN:
        // 1. Address berubah dari prevAddress yang ada
        // 2. Atau fresh connect (prevAddress undefined tapi bukan first load)
        const shouldLogin =
          (prevAddress && address !== prevAddress) || // Address berubah
          (!prevAddress && !isLoading); // Fresh connect setelah loading selesai

        if (shouldLogin) {
          console.log(prevAddress, address);
          setIsWalletSyncing(true);

          try {
            const response = await loginWithWallet(address);
            console.log(response);

            if (response && response.statusCode === 200) {
              // Mark address sebagai processed
              setProcessedAddresses(
                (prev) => new Set([...prev, address.toLowerCase()]),
              );
              // callback untuk refresh userdata
              if (refreshUserCallback) {
                await refreshUserCallback();
              }
              // Tunggu sebentar untuk memastikan backend sudah update
              await new Promise((resolve) => setTimeout(resolve, 500));
            } else if (
              response &&
              response.statusCode === 404 &&
              response.redirect
            ) {
              console.log("redirecting to syncing page");
              router.push(response.redirect);
            }
          } catch (error: any) {
            console.error(error);
          } finally {
            setIsWalletSyncing(false);
          }
        } else {
          console.log(
            "🔄 Setting prevAddress without login (first load):",
            address,
          );
        }

        // update previous address dengan address sekarang
        setPrevAddress(address);
      } else if (!isConnected && prevAddress) {
        console.log("💸 Wallet disconnected");
        // set prevAddress to undefined
        setPrevAddress(undefined);
        setProcessedAddresses(new Set()); // Clear processed addresses
        setIsWalletSyncing(false);
      }
    };

    handleWalletConnection();
  }, [
    isConnected,
    address,
    prevAddress,
    router,
    isInitialized,
    isWalletSyncing,
    refreshUserCallback,
    processedAddresses,
    isLoading,
  ]);

  // fungsi untuk connect wallet
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

  // Listen for account changes in MetaMask
  useEffect(() => {
    if (typeof window.ethereum !== "undefined") {
      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length === 0) {
          try {
            // logout dari backend sebelum disconnect
            await logout();
            console.log("✅ Logout API called successfully");
          } catch (error) {
            console.error("❌ Error during logout:", error);
          }
          // Always disconnect wagmi regardless of logout success/failure
          disconnect();
          setPrevAddress(undefined);
          setProcessedAddresses(new Set()); // Clear processed addresses
          setIsWalletSyncing(false);
        } else if (accounts[0] !== prevAddress && isInitialized) {
          // Account switched - clear processed addresses untuk allow new account login
          console.log("🔄 Account switched to:", accounts[0]);
          setProcessedAddresses(new Set());
          // Don't set prevAddress here, let the main useEffect handle it
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
  }, [disconnect, prevAddress, isInitialized]);

  const value: WalletContextType = {
    isConnected,
    address,
    isConnecting,
    isLoading,
    isWalletSyncing,
    disconnect,
    connectWallet,
    setRefreshUserCallback: (callback: () => Promise<void>) =>
      setRefreshUserCallback(() => callback),
    // Aliases for backward compatibility
    walletAddress: address || "",
    isWalletConnected: isConnected && !isWalletSyncing,
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
