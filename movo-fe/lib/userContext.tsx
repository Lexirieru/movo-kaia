"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
// import { useRouter } from "next/navigation";
import { getMe } from "@/utils/auth";

// tipe state auth
interface AuthContextType {
  user: any;
  loading: boolean;
  authenticated: boolean;
  refreshUser: () => Promise<void>; // biar bisa reload user dari luar
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  // const router = useRouter();

  // cek auth pertama kali
  const checkAuth = async () => {
    setLoading(true);
    const data = await getMe();
    console.log(data);
    // console.log(data.user);
    if (data && data.authenticated) {
      // console.log(data.user)
      setUser(data.user);
    } else {
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    authenticated: !!user,
    refreshUser: checkAuth,
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
