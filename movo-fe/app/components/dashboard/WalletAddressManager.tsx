// components/WalletAddressManager.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/userContext";
import { useWallet } from "@/lib/walletContext";
import { updateWalletAddressRole } from "@/app/api/api";
import { Wallet, Check, X, RefreshCw } from "lucide-react";

interface WalletAddressManagerProps {
  onRoleChange?: (role: "sender" | "receiver" | "none") => void;
}

export default function WalletAddressManager({
  onRoleChange,
}: WalletAddressManagerProps) {
  const { user, refreshUser } = useAuth();
  const { address, isConnected } = useWallet();
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Check if current connected wallet is different from stored wallet
  const needsUpdate = address && user?.walletAddress !== address;

  const updateWalletAddressHandler = async () => {
    if (!address || !user?._id) {
      setMessage({
        type: "error",
        text: "Please connect your wallet first",
      });
      return;
    }

    setIsUpdating(true);
    setMessage(null);

    try {
      const response = await updateWalletAddressRole(user._id, address, "none");

      if (response.success) {
        setMessage({
          type: "success",
          text: "Wallet address updated successfully!",
        });

        // Refresh user data to get updated wallet address
        await refreshUser();

        // Determine role based on new wallet address
        const newRole = determineUserRole(address);
        onRoleChange?.(newRole);

        // Clear message after 3 seconds
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({
          type: "error",
          text: response.message || "Failed to update wallet address",
        });
      }
    } catch (error) {
      console.error("Error updating wallet address:", error);
      setMessage({
        type: "error",
        text: "An error occurred while updating wallet address",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Function to determine user role based on wallet address
  const determineUserRole = (
    walletAddress: string,
  ): "sender" | "receiver" | "none" => {
    // This should be replaced with actual logic to check if wallet has created groups (sender)
    // or received payments (receiver). For now, we'll return "unknown" and let the app
    // determine based on user actions
    return "none";
  };

  if (!isConnected || !address) {
    return null;
  }

  return (
    <div className="mb-4">
      {needsUpdate && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-3">
            <RefreshCw className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-yellow-300 font-medium mb-1">
                Wallet Address Update Required
              </h3>
              <p className="text-yellow-200/80 text-sm mb-3">
                Your connected wallet address ({address.slice(0, 6)}...
                {address.slice(-4)}) is different from your stored address.
                Update to continue.
              </p>
              <div className="flex items-center space-x-2">
                <button
                  onClick={updateWalletAddressHandler}
                  disabled={isUpdating}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 text-sm disabled:opacity-50"
                >
                  {isUpdating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Update Wallet</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div
          className={`p-3 rounded-lg border mb-4 ${
            message.type === "success"
              ? "bg-green-500/20 border-green-500/30 text-green-300"
              : message.type === "error"
                ? "bg-red-500/20 border-red-500/30 text-red-300"
                : "bg-blue-500/20 border-blue-500/30 text-blue-300"
          }`}
        >
          <div className="flex items-center space-x-2">
            {message.type === "success" ? (
              <Check className="w-4 h-4" />
            ) : message.type === "error" ? (
              <X className="w-4 h-4" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span className="text-sm">{message.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
