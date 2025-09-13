"use client";
import { useState } from "react";
import SubmitButton from "../../register/components/SubmitButton";
import FormInput from "../../register/components/FormInput";
import { addWalletAddress } from "@/app/api/api";
import { useRouter } from "next/navigation";
import { Wallet, Mail, Link } from "lucide-react";
import { useWallet } from "@/lib/walletContext";

export default function SyncWalletForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // Use global wallet context
  const { address, isConnected, connectWallet, disconnect } = useWallet();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleConnectWallet = async () => {
    setError("");
    setSuccess("");

    try {
      await connectWallet();
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      setError(error.message || "Failed to connect wallet. Please try again.");
    }
  };

  const handleSyncWallet = async () => {
    if (!formData.email || !formData.password) {
      setError("Email and password are required");
      return;
    }

    if (!address) {
      setError("Please connect your wallet first");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // Langsung gunakan addWalletAddress dari api.tsx
      const response = await addWalletAddress(
        formData.email,
        formData.password,
        address,
      );

      console.log("Sync wallet response:", response);

      if (response && response.statusCode === 200) {
        setSuccess("Wallet successfully synced to your account!");
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } else {
        // Handle error berdasarkan response dari backend
        if (response?.message) {
          setError(response.message);
        } else {
          setError("Failed to sync wallet. Please try again.");
        }
      }
    } catch (error: any) {
      console.error("Sync wallet error:", error);
      setError(error.message || "Failed to sync wallet. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectWallet = () => {
    disconnect(); // Use global context function
    setError("");
  };

  return (
    <div className="space-y-6">
      {/* Form Header */}
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full flex items-center justify-center mb-4">
          <Link className="w-8 h-8 text-cyan-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Sync Your Wallet</h2>
        <p className="text-gray-400 text-sm">
          Link your wallet address to your account using your User ID
        </p>
      </div>

      {/* User ID Form */}
      <FormInput
        type="text"
        name="email"
        placeholder="Email"
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
        icon={Mail}
        required
      />

      {/* Wallet Connection Status */}
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
                onClick={handleDisconnectWallet}
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
                    Required to sync with your account
                  </p>
                </div>
              </div>
              <button
                onClick={handleConnectWallet}
                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs rounded-lg transition-colors duration-200"
              >
                Connect
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <p className="text-green-400 text-sm">{success}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Sync Button */}
      <SubmitButton
        isLoading={isLoading}
        onClick={isConnected ? handleSyncWallet : handleConnectWallet}
        text={isConnected ? "Sync Wallet to Account" : "Connect Wallet First"}
      />

      {/* Help Text */}
      <div className="text-center space-y-2">
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
        <p className="text-xs text-gray-500"></p>
      </div>
    </div>
  );
}
