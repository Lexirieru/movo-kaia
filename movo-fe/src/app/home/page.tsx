"use client";

import { useAuth } from "@/lib/userContext";
import Image from "next/image";
import MainLayout from "@/components/layout/MainLayout";

export default function HomePage() {
  const { loading } = useAuth();

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
          <div className="text-center py-20">
            <div className="mb-8">
              <Image
                src="/movo full.png"
                alt="Movo Full Logo"
                width={200}
                height={80}
                className="mx-auto mb-6"
              />
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Coming Soon
            </h1>

            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              We're working hard to bring you an amazing experience. Stay tuned
              for updates!
            </p>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-cyan-400 mb-4">
                What to expect:
              </h3>
              <ul className="text-left text-gray-300 space-y-2">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full mr-3"></span>
                  Enhanced user experience
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full mr-3"></span>
                  New features and improvements
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full mr-3"></span>
                  Better performance
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
