"use client";

import { useAuth } from "@/lib/userContext";
import Image from "next/image";
import Link from "next/link";
import { useState, useRef } from "react";
import MainLayout from "@/components/layout/MainLayout";
import Carousel from "@/components/home/Carousel";
import {
  LayoutDashboard,
  Plus,
  User,
  HelpCircle,
  ChevronDown,
} from "lucide-react";

const faqData = [
  {
    question: "How to create escrow?",
    answer:
      "To create an escrow, go to the Create page, fill in the receiver details, set the amount and duration, then confirm the transaction. The funds will be locked in the smart contract until the conditions are met.",
  },
  {
    question: "What tokens are supported?",
    answer:
      "Currently, we support IDRX and USDC tokens. More tokens will be added in the future to provide more flexibility for users.",
  },
  {
    question: "How do I withdraw funds?",
    answer:
      "As a receiver, you can claim your funds once the escrow conditions are met. As a sender, you can withdraw unclaimed funds after the escrow period expires.",
  },
  {
    question: "What is the minimum amount?",
    answer:
      "There is no minimum amount required to create an escrow. You can create escrows with any amount you prefer.",
  },
  {
    question: "How secure is the platform?",
    answer:
      "Our platform uses smart contracts on the Kaia blockchain, ensuring that funds are secure and transactions are transparent and immutable.",
  },
  {
    question: "Can I cancel an escrow?",
    answer:
      "Escrows cannot be cancelled once created. However, unclaimed funds can be withdrawn by the sender after the escrow period expires.",
  },
];

export default function HomePage() {
  const { loading } = useAuth();
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const faqRef = useRef<HTMLDivElement>(null);

  const handleFaqClick = () => {
    if (isFaqOpen) {
      setIsFaqOpen(false);
    } else {
      setIsFaqOpen(true);

      // Smooth scroll to FAQ section with delay
      setTimeout(() => {
        faqRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 300); // Increased delay to match animation
    }
  };

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
      <div className="bg-gradient-to-br from-black via-gray-900 to-black">
        {/* Hero Section */}
        <div className="px-4 py-8">
          <div className="container mx-auto max-w-4xl">
            {/* Logo and Carousel */}
            <div className="flex flex-col items-center justify-center text-center">
              {/* Logo with glow effect */}
              <div className="relative mb-2"></div>

              {/* Carousel */}
              <div className="w-full max-w-2xl">
                <Carousel />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="px-4 mb-8">
          <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto">
            <Link
              href="/dashboard"
              className="group relative overflow-hidden bg-gradient-to-br from-cyan-600 via-cyan-500 to-blue-600 hover:from-cyan-500 hover:via-cyan-400 hover:to-blue-500 rounded-2xl p-6 text-center transition-all duration-500 transform hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/25"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10 text-white flex justify-center items-center flex-col">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-white/30 transition-all duration-300">
                  <LayoutDashboard className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">Dashboard</h3>
                <p className="text-cyan-100 text-sm opacity-90">
                  View your streams and activity
                </p>
              </div>
            </Link>

            <Link
              href="/create-escrow"
              className="group relative overflow-hidden bg-gradient-to-br from-green-600 via-green-500 to-emerald-600 hover:from-green-500 hover:via-green-400 hover:to-emerald-500 rounded-2xl p-6 text-center transition-all duration-500 transform hover:scale-105 hover:shadow-2xl hover:shadow-green-500/25"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10 text-white flex justify-center items-center flex-col">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-white/30 transition-all duration-300">
                  <Plus className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">Create</h3>
                <p className="text-green-100 text-sm opacity-90">
                  Create new escrow streams
                </p>
              </div>
            </Link>

            <Link
              href="/profile"
              className="group relative overflow-hidden bg-gradient-to-br from-purple-600 via-purple-500 to-pink-600 hover:from-purple-500 hover:via-purple-400 hover:to-pink-500 rounded-2xl p-6 text-center transition-all duration-500 transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10 text-white flex justify-center items-center flex-col">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-white/30 transition-all duration-300">
                  <User className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">Profile</h3>
                <p className="text-purple-100 text-sm opacity-90">
                  Manage your account
                </p>
              </div>
            </Link>

            {/* FAQ Button tanpa arrow */}
            <button
              onClick={handleFaqClick}
              className="group relative overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-red-600 hover:from-orange-500 hover:via-orange-400 hover:to-red-500 rounded-2xl p-6 text-center transition-all duration-500 transform hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/25"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10 text-white flex justify-center items-center flex-col">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-white/30 transition-all duration-300">
                  <HelpCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">FAQ</h3>
                <p className="text-orange-100 text-sm opacity-90">
                  Frequently Asked Questions
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* FAQ Section with smooth animation */}
        <div
          ref={faqRef}
          className={`px-4 transition-all duration-700 ease-in-out transform ${
            isFaqOpen
              ? "translate-y-0 opacity-100 scale-100 mb-8"
              : "translate-y-8 opacity-0 scale-95 max-h-0 overflow-hidden"
          }`}
          style={{
            maxHeight: isFaqOpen ? "2000px" : "0px",
          }}
        >
          <div className="max-w-4xl mx-auto">
            <div
              className={`bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 shadow-2xl transition-all duration-700 ${
                isFaqOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
              }`}
            >
              <h3 className="text-2xl font-bold text-white mb-6 text-center flex items-center justify-center gap-3">
                Frequently Asked Questions
              </h3>
              <div className="space-y-4">
                {faqData.map((faq, index) => (
                  <div
                    key={index}
                    className="border-b border-gray-700/50 last:border-b-0 pb-4 last:pb-0"
                  >
                    <button
                      onClick={() =>
                        setOpenFaqIndex(openFaqIndex === index ? null : index)
                      }
                      className="w-full text-left flex justify-between items-center p-4 hover:bg-gray-700/30 rounded-xl transition-all duration-300 group"
                    >
                      <span className="text-white font-medium group-hover:text-cyan-300 transition-colors duration-300">
                        {faq.question}
                      </span>
                      <ChevronDown
                        className={`w-5 h-5 text-cyan-400 transition-all duration-300 ${
                          openFaqIndex === index ? "rotate-180" : ""
                        } group-hover:text-cyan-300`}
                      />
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-400 ease-in-out ${
                        openFaqIndex === index
                          ? "max-h-40 opacity-100 mt-3"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      <div className="p-4 bg-gray-700/20 rounded-xl border border-gray-600/30">
                        <p className="text-gray-300 text-sm leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-center">
                Visit our documentation{" "}
                <Link
                  href="https://movo-payment.gitbook.io/movo-kaia"
                  className="text-cyan-400 underline"
                  target="_blank"
                >
                  here
                </Link>
                .
              </p>
            </div>
          </div>
        </div>

        {/* Decorative background elements */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 left-10 w-64 h-64 bg-cyan-400/3 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-32 right-16 w-80 h-80 bg-blue-600/3 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-purple-500/2 rounded-full blur-2xl animate-pulse delay-500"></div>
        </div>
      </div>
    </MainLayout>
  );
}
