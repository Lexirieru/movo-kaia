// components/HeroSection.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Globe } from "./Globe";
export default function HeroSection() {
  const [glowIntensity, setGlowIntensity] = useState(0);
  const router = useRouter();

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900"></div>

      {/* Animated Background Grid */}
      <div className="absolute inset-0 opacity-20">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
                     linear-gradient(cyan 1px, transparent 1px),
                     linear-gradient(90deg, cyan 1px, transparent 1px)
                `,
            backgroundSize: "50px 50px",
            animation: "grid-move 20s linear infinite",
          }}
        ></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Logo with Glow Effect */}
        <div className="mb-8 relative">
          <div
            className="absolute inset-0 bg-cyan-500 rounded-full blur-3xl opacity-30"
            style={{ transform: `scale(${1 + glowIntensity * 0.001})` }}
          ></div>
          <div className="relative  flex items-center justify-center">
            <Image
              src="/movo non-text.png"
              alt="Movo Icon"
              width={200}
              height={200}
            ></Image>
          </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
          <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
            Multi-Chain
          </span>
          <br />
          <span className="text-white">Crypto Bridge</span>
        </h1>

        <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
          Swap crypto seamlessly across multiple blockchains. Send tokens to
          anyone, anywhere, and let them convert to fiat instantly.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => router.push("/auth")}
            className="group relative px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-full font-bold text-white text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/50"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
            <span className="relative">Get Started!</span>
          </button>

          <button className="px-8 py-4 border-2 border-cyan-400/50 rounded-full font-semibold text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400 transition-all duration-300">
            Docs
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
          <div className="text-center">
            <div className="text-3xl font-bold text-cyan-400 mb-2">50+</div>
            <div className="text-gray-400 text-sm">Supported Chains</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">$2M+</div>
            <div className="text-gray-400 text-sm">Volume Traded</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">10K+</div>
            <div className="text-gray-400 text-sm">Happy Users</div>
          </div>
        </div>
      </div>
      {/* Globe Container */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden pointer-events-none">
        <div className="relative left-1/2 -translate-x-1/2 w-[150vw] aspect-square translate-y-[40%]">
          <Globe className="w-full h-full opacity-80" />
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-cyan-400 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-cyan-400 rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>

      <style jsx>{`
        @keyframes grid-move {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(50px, 50px);
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
          }
        }
      `}</style>
    </section>
  );
}
