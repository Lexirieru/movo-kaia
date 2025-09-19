"use client";

import { logout, loginWithWallet } from "@/app/api/api";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";

interface WalletContextType {
  isConnected: boolean;
  address: string | undefined;
  isConnecting: boolean;
  isWalletSyncing: boolean; // wallet sync sama backend
  disconnect: () => void;
  connectWallet: () => Promise<void>;
  walletAddress: string;
  isWalletConnected: boolean;
  setRefreshUserCallback: (callback: () => Promise<void>) => void; // callaback untuk refresh user
  disableAutoLogin: boolean; // flag untuk disable auto login
  setDisableAutoLogin: (disable: boolean) => void; // function untuk set disable auto login
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isWalletSyncing, setIsWalletSyncing] = useState(false);
  const [prevAddress, setPrevAddress] = useState<string | undefined>(undefined);
  const [refreshUserCallback, setRefreshUserCallback] = useState<
    (() => Promise<void>) | null
  >(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [processedAddresses, setProcessedAddresses] = useState<Set<string>>(
    new Set(),
  );
  const [disableAutoLogin, setDisableAutoLogin] = useState(false);
  const router = useRouter();

  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();

  useEffect(() => {
    // Initialize and check for existing connection
    const checkConnection = async () => {
      try {
        // Wagmi handles wallet detection automatically
        console.log("Wagmi wallet state:", { isConnected, address });
      } catch (error) {
        console.error("Error checking wallet connection:", error);
      }

      // Reduce loading time
      const timer = setTimeout(() => {
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
      console.log("🔍 handleWalletConnection called:", {
        isInitialized,
        isWalletSyncing,
        isConnected,
        address,
        prevAddress,
        isConnecting,
        processedAddresses: Array.from(processedAddresses),
      });

      if (!isInitialized) {
        console.log("❌ Not initialized yet, skipping login");
        return;
      }

      if (isWalletSyncing) {
        console.log("❌ Already syncing, skipping login");
        return;
      }

      if (disableAutoLogin) {
        console.log("❌ Auto login disabled, skipping login");
        return;
      }

      // KONDISI LOGIN: Wallet terconnect dan address ada
      if (isConnected && address) {
        // PENGECEKAN: Cek jika address sudah pernah diproses
        if (processedAddresses.has(address.toLowerCase())) {
          console.log("✅ Address already processed, no need to login");
          // Update prevAddress jika belum di-set
          if (prevAddress !== address) {
            setPrevAddress(address);
          }
          return;
        }

        // KONDISI untuk LOGIN - Lebih sederhana:
        // Login jika wallet connected dan belum pernah login untuk address ini
        const shouldLogin = !processedAddresses.has(address.toLowerCase());

        if (shouldLogin) {
          console.log("🚀 Starting login process for address:", address);
          setIsWalletSyncing(true);

          try {
            const response = await loginWithWallet(address);
            console.log("✅ Login response:", response);

            if (response && response.statusCode === 200) {
              console.log("✅ Login successful");
              // Mark address sebagai processed
              setProcessedAddresses(
                (prev) => new Set([...prev, address.toLowerCase()]),
              );
              // callback untuk refresh userdata
              if (refreshUserCallback) {
                console.log("🔄 Calling refresh user callback");
                await refreshUserCallback();
              }
              // Tunggu sebentar untuk memastikan backend sudah update
              await new Promise((resolve) => setTimeout(resolve, 1000));
            } else if (
              response &&
              (response.statusCode === 404 || response.statusCode === 409) &&
              response.redirect
            ) {
              console.log("🔄 Redirecting to syncing page:", response.redirect);
              router.push(response.redirect);
            } else if (response && response.statusCode === 404) {
              console.log("🔄 User not found, redirecting to sync-wallet");
              router.push("/sync-wallet");
            } else {
              console.error("❌ Unexpected login response:", response);
            }
          } catch (error: any) {
            console.error("❌ Login error:", error);
          } finally {
            setIsWalletSyncing(false);
          }
        } else {
          console.log("⏭️ No need to login for address:", address);
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
  ]);

  // fungsi untuk connect wallet
  const connectWallet = async (): Promise<void> => {
    try {
      console.log("🔌 Attempting to connect wallet...");

      // Only connect in browser environment
      if (typeof window === "undefined") {
        throw new Error(
          "Wallet connection is only available in browser environment",
        );
      }

      // Use the first available connector
      if (connectors.length === 0) {
        throw new Error("No wallet connectors available");
      }

      console.log("🔄 Connecting with Wagmi...");
      await connect({ connector: connectors[0] });
      console.log("✅ Wallet connected successfully");
    } catch (error: any) {
      console.error("❌ Error connecting wallet:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw error;
    }
  };

  // Disconnect function for Wagmi
  const disconnect = async () => {
    try {
      // Only disconnect in browser environment
      if (typeof window !== "undefined") {
        await wagmiDisconnect();
      }
      await logout();
      console.log("✅ Logout API called successfully");

      setPrevAddress(undefined);
      setProcessedAddresses(new Set());
      setIsWalletSyncing(false);
    } catch (error) {
      console.error("❌ Error during disconnect:", error);
      // Still reset state even if logout fails
      setPrevAddress(undefined);
      setProcessedAddresses(new Set());
      setIsWalletSyncing(false);
    }
  };

  const value: WalletContextType = {
    isConnected,
    address,
    isConnecting,
    isWalletSyncing,
    disconnect,
    connectWallet,
    setRefreshUserCallback: (callback: () => Promise<void>) =>
      setRefreshUserCallback(() => callback),
    // Aliases for backward compatibility
    walletAddress: address || "",
    isWalletConnected: isConnected && !isWalletSyncing,
    disableAutoLogin,
    setDisableAutoLogin,
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
