"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { getMe } from "@/utils/auth";

import {
  updateWalletAddressRole,
  updateWalletAddressRole as updateWalletAPI,
} from "@/app/api/api";

// Interface untuk user object yang lebih lengkap
interface User {
  _id: string;
  email: string;
  name?: string;
  role?: "sender" | "receiver" | "none";
  walletAddress?: string;
  WalletAddresses?: Array<{
    walletAddress: string;
    role: "sender" | "receiver";
    availableBalance: number;
  }>;
  createdAt: string;
  updatedAt?: string;
  // Tambahkan attributes lain sesuai dengan response dari backend
  [key: string]: any; // Untuk attributes yang belum terdefinisi
}

// Interface untuk response dari getMe()
interface GetMeResponse {
  authenticated: boolean;
  user: User;
  currentWalletAddress: string;
  currentRole: "sender" | "receiver" | "none";
}

// Tipe state auth
interface AuthContextType {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
  currentWalletAddress: string;
  currentRole: "sender" | "receiver" | "none";
  isRefreshing: boolean; // NEW: Track ketika data user sedang di-refresh
  refreshUser: () => Promise<void>; // biar bisa reload user dari luar
  checkAuth: () => Promise<void>; // Export checkAuth function
  updateUserWallet: (walletAddress: string, role: string) => Promise<boolean>;
  clearUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false); // NEW: Track refresh state
  const [currentWalletAddress, setCurrentWalletAddress] = useState<string>("");
  const [currentRole, setCurrentRole] = useState<
    "sender" | "receiver" | "none"
  >("none");

  // cek auth pertama kali
  const checkAuth = async () => {
    setLoading(true);
    try {
      const data: GetMeResponse = await getMe();

      if (data && data.authenticated) {
        setUser(data.user);
        setCurrentWalletAddress(data.currentWalletAddress || "");
        setCurrentRole(data.currentRole || "none");
      } else {
        setUser(null);
        setCurrentWalletAddress("");
        setCurrentRole("none");
      }
    } catch (error) {
      console.error("Error checking auth:", error);
      setUser(null);
      setCurrentWalletAddress("");
      setCurrentRole("none");
    } finally {
      setLoading(false);
    }
  };

  // Refresh user - dengan tracking state
  const refreshUser = async () => {
    setIsRefreshing(true);
    try {
      const data: GetMeResponse = await getMe();

      if (data && data.authenticated) {
        setUser(data.user);
        setCurrentWalletAddress(data.currentWalletAddress || "");
        setCurrentRole(data.currentRole || "none");
      } else {
        setUser(null);
        setCurrentWalletAddress("");
        setCurrentRole("none");
      }
    } catch (error) {
      console.error("Error refreshing user:", error);
      setUser(null);
      setCurrentWalletAddress("");
      setCurrentRole("none");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Function to update user wallet address
  const updateUserWallet = async (
    walletAddress: string,
    role: string,
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const result = await updateWalletAddressRole(
        user._id,
        walletAddress,
        role,
      );

      if (result.success) {
        // Refresh user data dari server untuk get latest info
        await checkAuth();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error updating wallet:", error);
      return false;
    }
  };

  // Function to clear user data (logout)
  const clearUser = () => {
    setUser(null);
    setCurrentWalletAddress("");
    setCurrentRole("none");
    // Clear any stored auth tokens if you have them
    if (typeof window !== "undefined") {
      localStorage.removeItem("authToken");
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    isRefreshing, // NEW: Add refreshing state
    currentWalletAddress,
    currentRole,
    authenticated: !!user,
    refreshUser,
    checkAuth, // Export checkAuth function
    updateUserWallet,
    clearUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook untuk konsumsi
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
