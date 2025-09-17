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
import lineWalletProvider from "./lineWalletProvider";

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
  const [address, setAddress] = useState<string | undefined>(undefined);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isWalletSyncing, setIsWalletSyncing] = useState(false);
  const [prevAddress, setPrevAddress] = useState<string | undefined>(undefined);
  const [refreshUserCallback, setRefreshUserCallback] = useState<
    (() => Promise<void>) | null
  >(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [processedAddresses, setProcessedAddresses] = useState<Set<string>>(
    new Set(),
  );
  const router = useRouter();

  useEffect(() => {
    // Initialize LINE Mini Dapp and check for existing connection
    const checkConnection = async () => {
      try {
        // Only initialize in browser environment
        if (typeof window !== 'undefined') {
          // Initialize LINE Mini Dapp SDK
          await lineWalletProvider.init();
          
          // Check if browser is supported
          if (!lineWalletProvider.isSupportedBrowser()) {
            console.warn("Browser not supported by LINE Mini Dapp");
          }

          // Check for existing wallet connection
          const currentAccount = await lineWalletProvider.getAccount();
          if (currentAccount) {
            setAddress(currentAccount);
            setIsConnected(true);
            console.log("Existing wallet connection found:", currentAccount);
          }
        }
      } catch (error) {
        console.error("Error initializing LINE Mini Dapp:", error);
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
      setIsConnecting(true);
      
      // Only connect in browser environment
      if (typeof window === 'undefined') {
        throw new Error("Wallet connection is only available in browser environment");
      }
      
      const connectedAddress = await lineWalletProvider.connectWallet();
      
      if (connectedAddress) {
        setAddress(connectedAddress);
        setIsConnected(true);
        console.log("Wallet connected successfully:", connectedAddress);
      } else {
        throw new Error("Failed to connect wallet");
      }
    } catch (error: any) {
      console.error("❌ Error connecting wallet:", error);
      setIsConnected(false);
      setAddress(undefined);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect function for LINE Mini Dapp
  const disconnect = async () => {
    try {
      // Only disconnect in browser environment
      if (typeof window !== 'undefined') {
        await lineWalletProvider.disconnectWallet();
      }
      await logout();
      console.log("✅ Logout API called successfully");
      
      setAddress(undefined);
      setIsConnected(false);
      setPrevAddress(undefined);
      setProcessedAddresses(new Set());
      setIsWalletSyncing(false);
    } catch (error) {
      console.error("❌ Error during disconnect:", error);
      // Still reset state even if logout fails
      setAddress(undefined);
      setIsConnected(false);
      setPrevAddress(undefined);
      setProcessedAddresses(new Set());
      setIsWalletSyncing(false);
    }
  };

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
