// components/HowItWorks.tsx
"use client";

import { useState } from "react";

export default function HowItWorks() {
  const [activeTab, setActiveTab] = useState<'sender' | 'receiver'>('sender');

  const senderSteps = [
    {
      step: 1,
      title: "Connect Your Wallet",
      description: "Link your crypto wallet to access multi-chain assets",
      icon: "🔗",
      details: "Support for MetaMask, WalletConnect, and 20+ popular wallets"
    },
    {
      step: 2,
      title: "Select Assets & Chain",
      description: "Choose the cryptocurrency and blockchain network",
      icon: "⚡",
      details: "50+ blockchains including Ethereum, BSC, Polygon, Arbitrum"
    },
    {
      step: 3,
      title: "Enter Recipient Info",
      description: "Add receiver's wallet address or contact details",
      icon: "👤",
      details: "QR code scanning and address book integration"
    },
    {
      step: 4,
      title: "Send & Track",
      description: "Execute transaction and monitor real-time progress",
      icon: "🚀",
      details: "Live tracking across multiple blockchain networks"
    }
  ];

  const receiverSteps = [
    {
      step: 1,
      title: "Receive Notification",
      description: "Get instant alerts when crypto arrives in your wallet",
      icon: "📱",
      details: "Email, SMS, and push notifications available"
    },
    {
      step: 2,
      title: "Review Transaction",
      description: "Verify the received assets and transaction details",
      icon: "✅",
      details: "Complete transaction history and verification tools"
    },
    {
      step: 3,
      title: "Choose Conversion",
      description: "Select fiat currency and conversion method",
      icon: "💱",
      details: "Support for USD, EUR, GBP and 50+ fiat currencies"
    },
    {
      step: 4,
      title: "Cash Out",
      description: "Transfer funds to your bank account or card",
      icon: "💰",
      details: "Instant transfers to 200+ countries worldwide"
    }
  ];

  const currentSteps = activeTab === 'sender' ? senderSteps : receiverSteps;

  return (
    <section className="relative py-20 px-6 bg-gradient-to-b from-black via-gray-900 to-black">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              How It Works
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Seamless crypto-to-fiat conversion across multiple blockchain networks
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-12">
          <div className="relative bg-gray-800/50 backdrop-blur-sm p-1 rounded-full border border-cyan-400/20">
            <div
              className={`absolute top-1 bottom-1 w-1/2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-full transition-transform duration-300 ${
                activeTab === 'receiver' ? 'transform translate-x-full' : ''
              }`}
            ></div>
            <button
              onClick={() => setActiveTab('sender')}
              className={`relative z-10 px-8 py-3 rounded-full font-semibold transition-colors duration-300 ${
                activeTab === 'sender' ? 'text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
                Sender
            </button>
            <button
              onClick={() => setActiveTab('receiver')}
              className={`relative z-10 px-8 py-3 rounded-full font-semibold transition-colors duration-300 ${
                activeTab === 'receiver' ? 'text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
               Receiver
            </button>
          </div>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {currentSteps.map((item, index) => (
            <div
              key={`${activeTab}-${index}`}
              className="group relative bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-cyan-400/50 transition-all duration-300 hover:transform hover:scale-105"
              style={{
                animation: `slideIn 0.5s ease-out ${index * 0.1}s both`
              }}
            >
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              {/* Step Number */}
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {item.step}
              </div>

              {/* Icon */}
              <div className="text-4xl mb-4 text-center opacity-80">
                {item.icon}
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-white mb-3 text-center">
                {item.title}
              </h3>
              <p className="text-gray-300 text-center mb-4 leading-relaxed">
                {item.description}
              </p>
              <p className="text-sm text-cyan-400 text-center opacity-80">
                {item.details}
              </p>

              {/* Connection Line (except last item) */}
              {index < currentSteps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-cyan-400 to-transparent"></div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-3 bg-gray-800/50 backdrop-blur-sm px-6 py-3 rounded-full border border-cyan-400/20">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-gray-300">
              {activeTab === 'sender' ? 'Ready to send crypto?' : 'Ready to receive and cash out?'}
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}