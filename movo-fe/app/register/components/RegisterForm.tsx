import { useState } from "react";
import SubmitButton from "./SubmitButton";
// import SocialLogin from "./SocialLogin";
import { Mail, Lock, User, Wallet } from "lucide-react";
import FormInput from "./FormInput";
import { register } from "@/app/api/api";
import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/walletContext"; // Import existing context
// import { ConnectButton } from ; // Optional: use RainbowKit button

export default function RegisterForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [walletError, setWalletError] = useState<string>("");

  // Use existing wallet context
  const { address, isConnected, connectWallet, disconnect } = useWallet();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleConnectWallet = async () => {
    setWalletError("");

    try {
      await connectWallet();
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      setWalletError(
        error.message || "Failed to connect wallet. Please try again.",
      );
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name || !formData.email || !formData.password) {
      alert("Please fill in all required fields");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (!isConnected || !address) {
      alert("Please connect your wallet first");
      return;
    }

    setIsLoading(true);

    try {
      // Call register API with wallet address
      const response = await register(
        formData.email,
        formData.name,
        formData.password,
        address, // Use address from wagmi
      );

      console.log(response);

      if (response.statusCode === 200) {
        // Redirect to dashboard
        router.push("/dashboard");
      } else {
        alert("Registration failed. Please try again.");
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      alert(error.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Form fields */}
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

      {/* Wallet Connection Section */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">
          Wallet Connection <span className="text-red-400">*</span>
        </label>

        {isConnected ? (
          <div className="bg-gray-800/50 border border-cyan-400/20 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-300">Connected Wallet</p>
                  <p className="text-xs text-gray-400 font-mono">
                    {address && `${address.slice(0, 6)}...${address.slice(-4)}`}
                  </p>
                </div>
              </div>
              <button
                onClick={disconnect}
                className="text-xs text-red-400 hover:text-red-300 transition-colors duration-200"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800/50 border border-gray-600/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Wallet className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-300">Connect Your Wallet</p>
                  <p className="text-xs text-gray-400">
                    Required for account registration
                  </p>
                </div>
              </div>
              {/* Option 1: Custom button */}
              <button
                onClick={handleConnectWallet}
                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs rounded-lg transition-colors duration-200"
              >
                Connect
              </button>

              {/* Option 2: RainbowKit button (uncomment if you want to use it) */}
              {/* <ConnectButton.Custom>
                {({ account, chain, openConnectModal, mounted }) => {
                  return (
                    <button
                      onClick={openConnectModal}
                      className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs rounded-lg transition-colors duration-200"
                    >
                      Connect
                    </button>
                  );
                }}
              </ConnectButton.Custom> */}
            </div>
          </div>
        )}

        {/* Wallet Error Message */}
        {walletError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <p className="text-red-400 text-sm">{walletError}</p>
          </div>
        )}
      </div>

      <SubmitButton
        isLoading={isLoading}
        onClick={handleSubmit}
        text="Create Account"
      />

      {/* <SocialLogin /> */}

      {/* Terms and wallet info sections */}
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

      <div className="text-center">
        <p className="text-xs text-gray-500">
          Don't have a wallet?{" "}
          <a
            href="https://metamask.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 transition-colors duration-200"
          >
            Install MetaMask
          </a>
        </p>
      </div>
    </div>
  );
}
