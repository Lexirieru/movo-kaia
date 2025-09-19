"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/walletContext";
import MainLayout from "@/components/layout/MainLayout";
import WalletWarning from "@/components/dashboard/WalletWarning";
import CreateStreamModal from "@/components/dashboard/sender/CreateStreamModal";
import { ArrowLeft, Plus } from "lucide-react";

export default function CreateEscrowPage() {
  const { isConnected, address } = useWallet();
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Auto-open modal when page loads
  useEffect(() => {
    if (isConnected && address) {
      setIsCreateModalOpen(true);
    }
  }, [isConnected, address]);

  const handleEscrowCreated = () => {
    // Close modal and redirect to dashboard
    setIsCreateModalOpen(false);
    router.push("/dashboard");
  };

  const handleClose = () => {
    setIsCreateModalOpen(false);
    router.push("/dashboard");
  };

  if (!isConnected || !address) {
    return (
      <MainLayout>
        <WalletWarning />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Create Escrow</h1>
              <p className="text-gray-400">
                Set up a new escrow payment stream
              </p>
            </div>
          </div>
        </div>

        {/* Create Escrow Button */}
        <div className="text-center py-12">
          <div className="bg-white/5 rounded-2xl border border-white/10 p-12 max-w-md mx-auto">
            <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Plus className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Ready to Create?</h2>
            <p className="text-gray-400 mb-8">
              Click the button below to start creating your escrow payment stream
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-8 py-4 rounded-xl font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 flex items-center space-x-2 hover:scale-105 group mx-auto"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
              <span>Create Escrow</span>
            </button>
          </div>
        </div>

        {/* Create Stream Modal */}
        <CreateStreamModal
          isOpen={isCreateModalOpen}
          onClose={handleClose}
          onCreateStream={() => {}} // This will be handled by the modal
          onEscrowCreated={handleEscrowCreated}
        />
      </div>
    </MainLayout>
  );
}
