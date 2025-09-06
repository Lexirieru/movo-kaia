"use client";

import { useWallet } from "@/lib/walletContext";
import { Smartphone, CheckCircle, AlertTriangle } from "lucide-react";

export default function SmartContractStatus() {
  const { isConnected } = useWallet();

  if (!isConnected) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          <div>
            <h3 className="text-yellow-400 font-medium">Smart Contract Integration Pending</h3>
            <p className="text-yellow-300 text-sm mt-1">
              Connect your wallet to enable direct smart contract interactions
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
      <div className="flex items-center space-x-3">
        <CheckCircle className="w-5 h-5 text-green-400" />
        <div>
          <h3 className="text-green-400 font-medium">Smart Contract Integration Active</h3>
          <p className="text-green-300 text-sm mt-1">
            Your wallet is connected and ready for blockchain transactions
          </p>
        </div>
      </div>
    </div>
  );
}
