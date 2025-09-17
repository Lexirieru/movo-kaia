"use client";

import { ReactNode } from "react";
import Navbar from "./Navbar";
import BottomNavbar from "../shared/BottomNavbar";

interface MainLayoutProps {
  children: ReactNode;
  showNavbar?: boolean;
  showBottomNav?: boolean;
  showRoleBadge?: boolean;
  className?: string;
}

export default function MainLayout({
  children,
  showNavbar = true,
  showBottomNav = true,
  showRoleBadge = true,
  className = "",
}: MainLayoutProps) {
  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-black via-gray-900 to-black ${className}`}
    >
      {/* Top Navbar */}
      {showNavbar && <Navbar showRoleBadge={showRoleBadge} />}

      {/* Main Content */}
      <main
        className={`${showNavbar ? "pt-16" : ""} ${showBottomNav ? "pb-20" : ""}`}
      >
        {children}
      </main>

      {/* Bottom Navigation */}
      {showBottomNav && <BottomNavbar />}
    </div>
  );
}
