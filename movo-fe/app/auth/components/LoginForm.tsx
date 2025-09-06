"use client";
import { useState } from "react";
import FormInput from "./FormInput";
import SocialLogin from "./SocialLogin";
import { Mail, Lock } from "lucide-react";
import SubmitButton from "./SubmitButton";
import { login } from "@/app/api/api";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    // Simulate API call
    const response = await login(formData.email, formData.password);
    console.log(response);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(false);
    if (response.statusCode == 200) {
      router.push("/dashboard");
      // kasih redirect ke halaman dashboard pengguna
    }
  };

  return (
    <div className="space-y-6">
      <FormInput
        type="email"
        name="email"
        placeholder="Email Address"
        value={formData.email}
        onChange={handleInputChange}
        icon={Mail}
        required
      />

      <FormInput
        type="password"
        name="password"
        placeholder="Password"
        value={formData.password}
        onChange={handleInputChange}
        icon={Lock}
        showPasswordToggle
        required
      />

      <div className="text-right">
        <button
          type="button"
          className="text-sm text-gray-400 hover:text-cyan-400 transition-colors duration-200"
        >
          Forgot password?
        </button>
      </div>

      <SubmitButton
        isLoading={isLoading}
        onClick={handleSubmit}
        text="Sign In"
      />

      <SocialLogin />
    </div>
  );
}
