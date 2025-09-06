"use client";

import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useEffect, useState } from "react";
import Header from "./components/landing/Header";
import HeroSection from "./components/landing/HeroSection";
import HowItWorks from "./components/landing/HowItWorks";
import Footer from "./components/landing/Footer";

export default function App() {
  // =========================================================================
  // BAGIAN INTI MINI APP - JANGAN DIHAPUS
  // Kode ini penting untuk komunikasi dengan aplikasi Coinbase
  // =========================================================================
  const { setFrameReady, isFrameReady } = useMiniKit();
  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className={`min-h-screen bg-black text-white overflow-x-hidden transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
      {/* Global Styles */}
      <style jsx global>{`
        /* Smooth Scrolling */
        html {
          scroll-behavior: smooth;
        }

        /* Custom Scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: #1a1a1a;
        }
        
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #06b6d4, #3b82f6);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #0891b2, #2563eb);
        }

        /* CSS Variables for Theme */
        :root {
          --app-background: #000000;
          --app-foreground: #ffffff;
          --app-secondary-foreground: #a1a1aa;
          --app-accent: #06b6d4;
          --app-accent-foreground: #ffffff;
        }

        /* Glow Animation */
        @keyframes glow {
          0%, 100% {
            text-shadow: 0 0 5px #06b6d4, 0 0 10px #06b6d4, 0 0 15px #06b6d4;
          }
          50% {
            text-shadow: 0 0 10px #3b82f6, 0 0 20px #3b82f6, 0 0 30px #3b82f6;
          }
        }

        /* Pulse Animation */
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 5px rgba(6, 182, 212, 0.5);
          }
          50% {
            box-shadow: 0 0 20px rgba(6, 182, 212, 0.8), 0 0 30px rgba(59, 130, 246, 0.6);
          }
        }

        /* Gradient Animation */
        @keyframes gradient-shift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        /* Floating Animation */
        @keyframes float-smooth {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        /* Neon Glow Utilities */
        .glow-cyan {
          animation: glow 2s ease-in-out infinite alternate;
        }

        .pulse-glow-cyan {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .gradient-animated {
          background-size: 400% 400%;
          animation: gradient-shift 3s ease infinite;
        }

        .float-animation {
          animation: float-smooth 3s ease-in-out infinite;
        }

        /* Background Grid Animation */
        .grid-background {
          background-image: 
            linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
          animation: grid-move 20s linear infinite;
        }

        @keyframes grid-move {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(50px, 50px);
          }
        }
      `}</style>

      {/* Background Grid */}
      <div className="fixed inset-0 grid-background opacity-30 pointer-events-none"></div>

      {/* Main Content */}
      <div className="relative z-10">
        <Header />
        <HeroSection />
        <HowItWorks />
        <Footer />
      </div>

      {/* Back to Top Button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-8 right-8 w-12 h-12 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-full flex items-center justify-center text-white hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-cyan-500/25 z-50"
        style={{
          opacity: isLoaded ? '1' : '0',
          transform: isLoaded ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.3s ease'
        }}
      >
        <svg 
          className="w-6 h-6" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M5 10l7-7m0 0l7 7m-7-7v18" 
          />
        </svg>
      </button>
    </div>
  );
}