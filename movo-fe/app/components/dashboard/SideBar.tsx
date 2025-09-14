"use client";

import { useRouter } from "next/navigation";
import { History, X, Home } from "lucide-react";

interface SideBarProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: "sender" | "receiver" | "none";
}

export default function SideBar({ isOpen, onClose, userRole }: SideBarProps) {
  const router = useRouter();

  const handleHistoryClick = () => {
    if (userRole === "sender") {
      router.push("/history/sender");
    } else if (userRole === "receiver") {
      router.push("/history/receiver");
    }
    onClose();
  };
  return (
    <>
      {/* For Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-gray-900/95 backdrop-blur-xl border-r border-gray-700/50 z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-10
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
          <h2 className="text-lg font-semibold text-white">Navigation</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors lg:hidden"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-2">
          {/* Dashboard */}
          <button
            onClick={() => {
              router.push("/dashboard");
              onClose();
            }}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-gray-800/50 transition-colors text-left"
          >
            <Home className="w-5 h-5 text-gray-400" />
            <span className="text-gray-300">Dashboard</span>
          </button>

          {/* History */}
          <button
            onClick={handleHistoryClick}
            disabled={userRole === "none"}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-left ${
              userRole === "none" 
                ? "opacity-50 cursor-not-allowed" 
                : "hover:bg-gray-800/50"
            }`}
          >
            <History className="w-5 h-5 text-gray-400" />
            <span className="text-gray-300">
              {userRole === "sender" ? "Group History" : 
               userRole === "receiver" ? "Transaction History" : 
               "History"}
            </span>
          </button>
        </nav>

        {/* Footer Info */}
        <div className="absolute bottom-4 left-4 right-4 p-4 bg-gray-800/30 rounded-lg">
          <p className="text-xs text-gray-400 text-center">
            Role: <span className="text-cyan-400 capitalize">{userRole}</span>
          </p>
        </div>
      </aside>
    </>
  );
}
