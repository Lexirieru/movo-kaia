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
