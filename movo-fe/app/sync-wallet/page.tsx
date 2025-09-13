"use client";

import AuthBackground from "../register/components/AuthBackground";
import SyncWalletForm from "./components/SyncWalletToAccountForm";

export default function SyncWalletPage() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <AuthBackground />

      {/* Main Card Container */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-gray-900/80 backdrop-blur-xl border border-cyan-400/20 rounded-2xl p-8 shadow-2xl shadow-cyan-500/10">
          <SyncWalletForm />
        </div>
      </div>
    </section>
  );
}
