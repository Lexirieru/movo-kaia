"use client";

import React from "react";
import MainLayout from "@/components/layout/MainLayout";
import { User, Settings, Bell, Clock, Sparkles } from "lucide-react";

const ProfilePage = () => {
  return (
    <MainLayout showRoleBadge={false}>
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          {/* Animated Icon Container */}
          <div className="relative mb-8">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-cyan-400/20 to-blue-600/20 rounded-full flex items-center justify-center border border-cyan-500/30 backdrop-blur-sm">
              <User className="w-12 h-12 text-cyan-400" />
            </div>

            {/* Floating sparkles animation */}
            <div className="absolute -top-2 -right-2 animate-bounce delay-100">
              <Sparkles className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="absolute -bottom-1 -left-3 animate-bounce delay-300">
              <Sparkles className="w-4 h-4 text-pink-400" />
            </div>
            <div className="absolute top-1 -left-4 animate-pulse">
              <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
            </div>
          </div>

          {/* Coming Soon Text */}
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Coming
            <span className="text-transparent bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text ml-3">
              Soon
            </span>
          </h1>

          <p className="text-gray-400 text-lg mb-8 leading-relaxed">
            We're working hard to bring you an amazing profile experience. Stay
            tuned for updates!
          </p>

          {/* Feature Preview Cards */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <Settings className="w-6 h-6 text-cyan-400 mb-2 mx-auto" />
              <span className="text-xs text-gray-300">Settings</span>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <Bell className="w-6 h-6 text-purple-400 mb-2 mx-auto" />
              <span className="text-xs text-gray-300">Notifications</span>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Clock className="w-5 h-5 text-cyan-400" />
              <span className="text-white font-medium">
                Development Progress
              </span>
            </div>

            <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
              <div className="bg-gradient-to-r from-cyan-400 to-blue-600 h-2 rounded-full w-3/4 animate-pulse"></div>
            </div>

            <span className="text-sm text-gray-400">75% Complete</span>
          </div>

          {/* Animated dots */}
          <div className="flex justify-center items-center mt-8 gap-2">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-100"></div>
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-200"></div>
          </div>
        </div>

        {/* Background decorations */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-cyan-400/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-32 right-16 w-40 h-40 bg-blue-600/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/4 w-20 h-20 bg-purple-500/5 rounded-full blur-2xl animate-pulse"></div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ProfilePage;
