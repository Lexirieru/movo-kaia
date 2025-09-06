// components/Header.tsx
"use client";


import Image from "next/image";

export default function Header() {
  return (
    <header className="flex justify-between items-center w-full px-6 py-3 relative z-20">
      <div className="flex items-center gap-3">
        <div className="relative">
          {/* <div className="absolute inset-0 bg-cyan-400 rounded-lg blur-sm opacity-50"></div> */}
          <Image 
            src="/movo full.png" 
            alt="Movo Logo" 
            width={40} 
            height={40}
            className="relative z-10 rounded-lg"
          />
        </div>
      </div>
      
      
    </header>
  );
}