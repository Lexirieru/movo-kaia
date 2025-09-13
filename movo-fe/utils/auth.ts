// utils/auth.ts
import { api } from "@/app/api/api";
export const getMe = async () => {
  try {
    const res = await api.get(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/check-auth`,
      {
        withCredentials: true, // penting untuk kirim cookie `user_session`
      },
    );

    return res.data;
  } catch (err: any) {
    console.error(err.message || err);
    return null;
  }
};

const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() || null;
  }
  return null;
};

// Function to get user session token
export const getUserSessionToken = (): string | null => {
  return getCookie("user_session");
};
