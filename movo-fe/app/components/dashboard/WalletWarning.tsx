"use client";

import { Wallet, Shield, AlertTriangle } from "lucide-react";

export default function WalletWarning() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md mx-auto text-center p-8 bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-cyan-400/20 shadow-2xl">
        {/* Warning Icon */}
        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-10 h-10 text-yellow-400" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white mb-4">
          Wallet Connection Required
        </h2>

        {/* Description */}
        <p className="text-gray-300 mb-6 leading-relaxed">
          To access your dashboard and manage your payment groups, you need to
          connect your crypto wallet first. This ensures secure and seamless
          transactions.
        </p>

        {/* Features List */}
        <div className="space-y-3 mb-8 text-left">
          <div className="flex items-center space-x-3 text-gray-300">
            <Shield className="w-5 h-5 text-cyan-400 flex-shrink-0" />
            <span className="text-sm">Secure wallet integration</span>
          </div>
          <div className="flex items-center space-x-3 text-gray-300">
            <Wallet className="w-5 h-5 text-cyan-400 flex-shrink-0" />
            <span className="text-sm">Multi-chain support</span>
          </div>
          <div className="flex items-center space-x-3 text-gray-300">
            <div className="w-5 h-5 text-cyan-400 flex-shrink-0">🔗</div>
            <span className="text-sm">Direct smart contract interaction</span>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
          <p className="text-cyan-300 text-sm">💡 Please connect your wallet</p>
        </div>
      </div>
    </div>
  );
}
