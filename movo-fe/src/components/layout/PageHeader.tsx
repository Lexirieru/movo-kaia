"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backPath?: string;
  walletAddress?: string;
  rightContent?: React.ReactNode;
}

export default function PageHeader({ 
  title, 
  subtitle, 
  backPath, 
  walletAddress,
  rightContent 
}: PageHeaderProps) {
  const router = useRouter();

  return (
    <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {backPath && (
            <button
              onClick={() => router.push(backPath)}
              className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          )}
          <div className="flex items-center space-x-3">
            <Image
              src="/movo non-text.png"
              alt="Movo Logo"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <div>
              <h1 className="text-xl font-bold text-cyan-400">{title}</h1>
              {subtitle && (
                <p className="text-xs text-gray-400">{subtitle}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {walletAddress && (
            <div className="text-xs text-gray-400">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </div>
          )}
          {rightContent}
        </div>
      </div>
    </div>
  );
}