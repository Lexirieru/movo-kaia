"use client";

import { Wallet, Shield, AlertTriangle } from "lucide-react";

export default function WalletWarning() {

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-2xl mx-auto text-center p-8 bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-cyan-400/20 shadow-2xl">
        {/* Warning Icon */}
        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-10 h-10 text-yellow-400" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white mb-4">
          Wallet Not Connected
        </h2>

        {/* Description */}
        <p className="text-gray-300 mb-8 leading-relaxed">
          Please connect your wallet using the connect button in the navigation bar to access the Movo platform and manage your payments.
        </p>

        {/* Wallet Info */}
        <div className="flex justify-center mb-8">
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-8 hover:border-blue-400/40 transition-all duration-300 max-w-md w-full">
            <div className="flex items-center justify-center w-20 h-20 bg-blue-500/20 rounded-full mx-auto mb-6">
              <Wallet className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-4 text-center">Connect Your Wallet</h3>
            <p className="text-gray-300 text-center mb-6">
              Use the connect button in the navigation bar to get started
            </p>
            <div className="space-y-3 text-left mb-8">
              <div className="flex items-center space-x-3 text-gray-300">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>Base Network support</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-300">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>Multiple wallet support</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-300">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>Secure transactions</span>
              </div>
            </div>
          </div>
        </div>

        {/* Features List */}
        <div className="space-y-3 text-center">
          <div className="flex items-center justify-center space-x-3 text-gray-300">
            <Shield className="w-5 h-5 text-cyan-400 flex-shrink-0" />
            <span className="text-sm">Secure wallet integration</span>
          </div>
          <div className="flex items-center justify-center space-x-3 text-gray-300">
            <Wallet className="w-5 h-5 text-cyan-400 flex-shrink-0" />
            <span className="text-sm">Base network support</span>
          </div>
          <div className="flex items-center justify-center space-x-3 text-gray-300">
            <div className="w-5 h-5 text-cyan-400 flex-shrink-0">🔗</div>
            <span className="text-sm">Direct smart contract interaction</span>
          </div>
        </div>
      </div>
    </div>
  );
}
