"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  LayoutDashboard,
  History,
  Plus,
  User,
  Download,
} from "lucide-react";
import { useAuth } from "@/lib/userContext";

export default function BottomNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const handleDashboardClick = () => {
    router.push("/dashboard");
  };

  const handleHistoryClick = () => {
    router.push("/history");
  };

  const handleCreateClaimClick = () => {
    // Conditional navigation based on user role
    if (user?.role === "receiver") {
      router.push("/");
    } else {
      router.push("/");
    }
  };

  const handleProfileClick = () => {
    router.push("/profile");
  };

  // Determine the middle button based on user role
  const getMiddleButton = () => {
    const isReceiver = user?.role === "receiver";
    const isClaim = pathname === "/";
    const isCreate = pathname === "/";

    return {
      id: isReceiver ? "claim" : "create-claim",
      label: isReceiver ? "Claim" : "Create",
      icon: isReceiver ? Download : Plus,
      onClick: handleCreateClaimClick,
      isActive: isReceiver ? isClaim : isCreate,
    };
  };

  const navItems = [
    {
      id: "home",
      label: "Home",
      icon: Home,
      onClick: () => handleNavigation("/home"),
      isActive: pathname === "/home",
    },
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      onClick: handleDashboardClick,
      isActive: pathname === "/dashboard" || pathname.startsWith("/dashboard"),
    },
    getMiddleButton(), // Dynamic middle button
    {
      id: "history",
      label: "History",
      icon: History,
      onClick: handleHistoryClick,
      isActive: pathname === "/history",
    },
    {
      id: "profile",
      label: "Profile",
      icon: User,
      onClick: handleProfileClick,
      isActive: pathname === "/profile",
    },
  ];

  const activeIndex = navItems.findIndex((item) => item.isActive);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="relative">
        {/* Floating active button - completely outside navbar */}
        {activeIndex !== -1 && (
          <div
            className="absolute -top-6 w-14 h-14 bg-gradient-to-br from-cyan-400 via-cyan-500 to-blue-600 rounded-full flex items-center justify-center shadow-2xl shadow-cyan-500/50 border-4 border-gray-900 transition-all duration-600 ease-out z-10"
            style={{
              left: `calc(${activeIndex * 20 + 10}% - 1.75rem)`,
            }}
          >
            {navItems[activeIndex] &&
              (() => {
                const IconComponent = navItems[activeIndex].icon;
                return <IconComponent className="w-7 h-7 text-white" />;
              })()}
          </div>
        )}

        {/* Curved cutout in navbar */}
        {activeIndex !== -1 && (
          <div
            className="absolute -top-2 w-16 h-4 bg-transparent transition-all duration-600 ease-out"
            style={{
              left: `calc(${activeIndex * 20 + 10}% - 2rem)`,
              clipPath: "ellipse(32px 8px at 50% 100%)",
              backgroundColor: "transparent",
              boxShadow: "inset 0 3px 0 0 rgb(17 24 39 / 0.95)",
            }}
          />
        )}

        {/* Compact navbar background - menempel ke bawah */}
        <nav className="bg-gradient-to-r from-gray-900/95 via-black/95 to-gray-900/95 backdrop-blur-xl border-t border-white/10 shadow-2xl">
          <div className="flex items-center justify-around py-3 px-2 pb-safe relative">
            {navItems.map((item, index) => {
              const IconComponent = item.icon;
              const isActive = item.isActive;

              return (
                <div
                  key={item.id}
                  className="relative flex-1 flex justify-center"
                >
                  <button
                    onClick={item.onClick}
                    className={`flex flex-col items-center justify-center py-2 px-2 rounded-xl transition-all duration-600 ease-out ${
                      isActive
                        ? "text-transparent opacity-30" // Hide the regular button when active
                        : "text-gray-400 hover:text-white hover:bg-white/10 hover:scale-105"
                    }`}
                  >
                    <IconComponent className="w-5 h-5 mb-1" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </nav>

        {/* Active label below floating button */}
        {activeIndex !== -1 && (
          <div
            className="absolute top-10 text-center transition-all duration-600 ease-out"
            style={{
              left: `calc(${activeIndex * 20 + 10}% - 2rem)`,
              width: "4rem",
            }}
          >
            <span className="text-xs font-semibold text-cyan-300 drop-shadow-sm">
              {navItems[activeIndex]?.label}
            </span>
          </div>
        )}

        {/* Subtle glow effect */}
        {activeIndex !== -1 && (
          <div
            className="absolute -top-8 w-20 h-8 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent rounded-full blur-2xl transition-all duration-600 ease-out"
            style={{
              left: `calc(${activeIndex * 20 + 10}% - 2.5rem)`,
            }}
          />
        )}
      </div>
    </div>
  );
}
