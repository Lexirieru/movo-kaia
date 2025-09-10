"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { getMe } from "@/utils/auth";

import {updateWalletAddress as updateWalletAPI} from "@/app/api/api"

interface User {
  _id: string;
  email: string;
  walletAddress?: string;
  role?: "sender" | "receiver" | "unknown";
  createdAt: string;
  updatedAt?: string;
}

// tipe state auth
interface AuthContextType {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
  refreshUser: () => Promise<void>; // biar bisa reload user dari luar
  updateUserWallet: (walletAddress: string) => Promise<boolean>;
  clearUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // cek auth pertama kali
  const checkAuth = async () => {
    setLoading(true);
    try {
      const data = await getMe();
      console.log(data);
      
      if (data && data.authenticated) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Error checking auth:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Function to update user wallet address
  const updateUserWallet = async (walletAddress: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const result = await updateWalletAPI(user._id, walletAddress);
      
      if (result.success) {
        // Update user state dengan wallet address baru
        setUser(prevUser => prevUser ? {
          ...prevUser,
          walletAddress: walletAddress,
          updatedAt: new Date().toISOString()
        } : null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating wallet:', error);
      return false;
    }
  };

  // Function to clear user data (logout)
  const clearUser = () => {
    setUser(null);
    // Clear any stored auth tokens if you have them
    localStorage.removeItem('authToken');
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    authenticated: !!user,
    refreshUser: checkAuth,
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