"use client";

import { useAuth } from "@/lib/userContext";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";

const carouselMessages = [
  "Create streams to several receivers in one click",
  "Withdrawable to fiat (coming soon)",
  "Powered by IDRX",
  "Coming soon to Indonesia, Singapore, Japan, Thailand, many countries in Asia and more",
  "Live on Line MiniDApp and Kaia Mainnet"
];

const faqData = [
  {
    question: "How to create escrow?",
    answer: "To create an escrow, go to the Create page, fill in the receiver details, set the amount and duration, then confirm the transaction. The funds will be locked in the smart contract until the conditions are met."
  },
  {
    question: "What tokens are supported?",
    answer: "Currently, we support IDRX and USDC tokens. More tokens will be added in the future to provide more flexibility for users."
  },
  {
    question: "How do I withdraw funds?",
    answer: "As a receiver, you can claim your funds once the escrow conditions are met. As a sender, you can withdraw unclaimed funds after the escrow period expires."
  },
  {
    question: "What is the minimum amount?",
    answer: "There is no minimum amount required to create an escrow. You can create escrows with any amount you prefer."
  },
  {
    question: "How secure is the platform?",
    answer: "Our platform uses smart contracts on the Kaia blockchain, ensuring that funds are secure and transactions are transparent and immutable."
  },
  {
    question: "Can I cancel an escrow?",
    answer: "Escrows cannot be cancelled once created. However, unclaimed funds can be withdrawn by the sender after the escrow period expires."
  }
];

export default function HomePage() {
  const { loading } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselMessages.length);
    }, 3000); // Change slide every 3 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </section>
    );
  }

  return (
    <MainLayout showRoleBadge={false}>
      <div className="px-4 py-6 min-h-[calc(100vh-9rem)]">
        <div className="container mx-auto max-w-4xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <Image
              src="/movo full.png"
              alt="Movo Full Logo"
              width={200}
              height={80}
              className="mx-auto mb-6"
            />
          </div>

          {/* Auto-sliding Carousel */}
          <div className="mb-12">
            <div className="relative bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 rounded-2xl p-8 overflow-hidden">
              <div className="relative h-32 flex items-center justify-center">
                <div className="text-center">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    {carouselMessages[currentSlide]}
                  </h2>
                  <div className="flex justify-center space-x-2 mt-4">
                    {carouselMessages.map((_, index) => (
                      <button
                        key={index}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          index === currentSlide
                            ? "bg-cyan-400 w-8"
                            : "bg-gray-500"
                        }`}
                        onClick={() => setCurrentSlide(index)}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Animated background gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-blue-500/10 animate-pulse"></div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto">
            <Link
              href="/dashboard"
              className="group bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl p-6 text-center transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/25"
            >
              <div className="text-white">
                <div className="text-4xl mb-3">📊</div>
                <h3 className="text-xl font-bold mb-2">Dashboard</h3>
                <p className="text-cyan-100 text-sm">View your streams and activity</p>
              </div>
            </Link>

            <Link
              href="/create-escrow"
              className="group bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl p-6 text-center transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-500/25"
            >
              <div className="text-white">
                <div className="text-4xl mb-3">➕</div>
                <h3 className="text-xl font-bold mb-2">Create</h3>
                <p className="text-green-100 text-sm">Create new escrow streams</p>
              </div>
            </Link>

            <Link
              href="/profile"
              className="group bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl p-6 text-center transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25"
            >
              <div className="text-white">
                <div className="text-4xl mb-3">👤</div>
                <h3 className="text-xl font-bold mb-2">Profile</h3>
                <p className="text-purple-100 text-sm">Manage your account</p>
              </div>
            </Link>

            <button
              onClick={() => setIsFaqOpen(!isFaqOpen)}
              className="group bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 rounded-xl p-6 text-center transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-orange-500/25"
            >
              <div className="text-white">
                <div className="text-4xl mb-3">❓</div>
                <h3 className="text-xl font-bold mb-2">FAQ</h3>
                <p className="text-orange-100 text-sm">Frequently Asked Questions</p>
                <span className={`text-orange-200 transition-transform duration-300 ${isFaqOpen ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </div>
            </button>
          </div>

          {/* FAQ Dropdown */}
          {isFaqOpen && (
            <div className="mt-8 max-w-4xl mx-auto">
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 text-center">Frequently Asked Questions</h3>
                <div className="space-y-4">
                  {faqData.map((faq, index) => (
                    <div key={index} className="border-b border-gray-700 last:border-b-0 pb-4 last:pb-0">
                      <button
                        onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                        className="w-full text-left flex justify-between items-center p-3 hover:bg-gray-700/50 rounded-lg transition-colors duration-200"
                      >
                        <span className="text-white font-medium">{faq.question}</span>
                        <span className={`text-cyan-400 transition-transform duration-200 ${
                          openFaqIndex === index ? 'rotate-180' : ''
                        }`}>
                          ▼
                        </span>
                      </button>
                      {openFaqIndex === index && (
                        <div className="mt-2 p-3 bg-gray-700/30 rounded-lg">
                          <p className="text-gray-300 text-sm leading-relaxed">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
