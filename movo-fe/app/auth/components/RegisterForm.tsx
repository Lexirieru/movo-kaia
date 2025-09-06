import { useState } from "react";
import SubmitButton from "./SubmitButton";
import SocialLogin from "./SocialLogin";
import { Mail, Lock, User } from "lucide-react";
import FormInput from "./FormInput";
import { register } from "@/app/api/api";
import { useRouter } from "next/navigation";

export default function RegisterForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    // Simulate API call
    const response = await register(
      formData.email,
      formData.name,
      formData.password,
    );
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(false);
    console.log(response);
    if (response.statusCode == 200) {
      // kasih redirect ke halaman dashboard pengguna
      router.push("/addbankdata");
    }
  };

  return (
    <div className="space-y-6">
      <FormInput
        type="text"
        name="name"
        placeholder="Full Name"
        value={formData.name}
        onChange={handleInputChange}
        icon={User}
        required
      />

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

      <FormInput
        type="password"
        name="confirmPassword"
        placeholder="Confirm Password"
        value={formData.confirmPassword}
        onChange={handleInputChange}
        icon={Lock}
        showPasswordToggle
        required
      />

      <SubmitButton
        isLoading={isLoading}
        onClick={handleSubmit}
        text="Create Account"
      />

      <SocialLogin />

      {/* Terms */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          By creating an account, you agree to our{" "}
          <button className="text-cyan-400 hover:text-cyan-300 transition-colors duration-200">
            Terms of Service
          </button>{" "}
          and{" "}
          <button className="text-cyan-400 hover:text-cyan-300 transition-colors duration-200">
            Privacy Policy
          </button>
        </p>
      </div>
    </div>
  );
}
