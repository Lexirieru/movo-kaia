"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Wallet,
  Globe,
  FileText,
  ShieldCheck,
  Zap,
  Play,
  Pause,
} from "lucide-react";

export default function ManualCarousel() {
  const features = [
    {
      title: "Movo Payment",
      desc: "Multi-Chain Cross-Border Payment Platform",
      icon: "/movo logo bawah hd white.png",
      iconType: "image",
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Flexible Withdrawals",
      desc: "Withdraw to bank accounts or crypto wallets anytime, anywhere with instant processing.",
      icon: Wallet,
      iconType: "component",
      color: "from-emerald-500 to-green-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Multichain Support",
      desc: "One integration supports multiple blockchains and global payment rails seamlessly.",
      icon: Globe,
      iconType: "component",
      color: "from-blue-500 to-indigo-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Transparent & Auditable",
      desc: "Track every payroll step with real-time visibility and complete compliance records.",
      icon: FileText,
      iconType: "component",
      color: "from-purple-500 to-pink-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Secure & Compliant",
      desc: "KYC/AML verified onboarding with military-grade encrypted, secure data storage.",
      icon: ShieldCheck,
      iconType: "component",
      color: "from-orange-500 to-red-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Real-Time Streaming",
      desc: "Instant salary streaming with continuous access, eliminating traditional payroll delays.",
      icon: Zap,
      iconType: "component",
      color: "from-yellow-500 to-orange-500",
      bgColor: "bg-yellow-500/10",
    },
  ];

  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // Auto slide with play/pause functionality
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % features.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [features.length, isPlaying]);

  const goToNext = () => {
    setIndex((prev) => (prev + 1) % features.length);
  };

  const goToPrev = () => {
    setIndex((prev) => (prev - 1 + features.length) % features.length);
  };

  const currentFeature = features[index];

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header with controls */}
      <div className="relative z-10 mb-[-20px] ml-4 sm:ml-6 flex items-center justify-between pr-4 sm:pr-6">
        <div className="transition-all duration-500">
          <h2 className="text-sm sm:text-base font-semibold text-white bg-gradient-to-r from-cyan-500/50 to-blue-500/50 backdrop-blur-md inline-block px-4 sm:px-6 py-2 rounded-2xl shadow-lg border border-white/20">
            Movo Features
          </h2>
        </div>

        {/* Play/Pause Button */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-all duration-200 border border-white/20"
          aria-label={isPlaying ? "Pause slideshow" : "Play slideshow"}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 text-white" />
          ) : (
            <Play className="w-4 h-4 text-white ml-0.5" />
          )}
        </button>
      </div>

      {/* Main Card */}
      <div className="relative group">
        <div
          className={`h-44 sm:h-48 lg:h-52 p-4 sm:p-6 pt-8 sm:pt-10 bg-gradient-to-br ${currentFeature.color} rounded-2xl shadow-xl flex items-center transition-all duration-700 relative overflow-hidden border border-white/30 text-white`}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/20 blur-2xl transform translate-x-16 -translate-y-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/10 blur-xl transform -translate-x-12 translate-y-12"></div>
          </div>

          {/* Content Container */}
          <div className="flex items-center w-full relative z-10">
            {/* Icon Container */}
            <div className="flex-shrink-0 mr-5 sm:mr-6">
              <div
                className={`w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-2xl ${currentFeature.bgColor} backdrop-blur-sm flex items-center justify-center shadow-2xl border border-white/20`}
              >
                {/* Conditional rendering based on icon type */}
                {currentFeature.iconType === "image" ? (
                  <Image
                    src={currentFeature.icon as string}
                    alt={currentFeature.title}
                    width={56}
                    height={56}
                    className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 object-contain drop-shadow-lg"
                  />
                ) : (
                  (() => {
                    const IconComponent =
                      currentFeature.icon as React.ComponentType<{
                        className?: string;
                      }>;
                    return (
                      <IconComponent className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 text-white drop-shadow-lg" />
                    );
                  })()
                )}
              </div>
            </div>

            {/* Text Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 sm:mb-3 leading-tight text-white line-clamp-2">
                {currentFeature.title}
              </h3>
              <p className="text-sm sm:text-base lg:text-lg text-white/90 leading-relaxed line-clamp-2 sm:line-clamp-3">
                {currentFeature.desc}
              </p>
            </div>
          </div>
        </div>

        {/* Enhanced Pagination with Real-time Progress */}
        <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl shadow-2xl border border-white/20">
            {features.map((feature, i) => {
              const isActive = i === index;
              return (
                <button
                  key={i}
                  aria-label={`Go to slide ${i + 1}: ${feature.title}`}
                  onClick={() => setIndex(i)}
                  className="group relative transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-cyan-300/60 rounded-full"
                >
                  {/* Base dot */}
                  <div
                    className={`relative overflow-hidden transition-all duration-300 ease-out ${
                      isActive
                        ? "w-8 h-2 rounded-full"
                        : "w-2 h-2 bg-white/40 hover:bg-white/70 hover:scale-110 rounded-full"
                    }`}
                  >
                    {/* Background for active dot */}
                    {isActive && (
                      <div className="absolute inset-0 bg-gray-600 rounded-full" />
                    )}

                    {/* Progress fill */}
                    {isActive && (
                      <div
                        className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 rounded-full shadow-lg transition-all duration-300 ease-out transform origin-left"
                        style={{
                          animation: isPlaying
                            ? "progressBar 5s linear infinite"
                            : "none",
                        }}
                      />
                    )}
                  </div>

                  {/* Glow effect */}
                  {isActive && (
                    <div className="absolute inset-0 w-8 h-2 bg-cyan-400/20 rounded-full blur-sm animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add CSS animation */}
      <style jsx>{`
        @keyframes progressBar {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }
      `}</style>
    </div>
  );
}
