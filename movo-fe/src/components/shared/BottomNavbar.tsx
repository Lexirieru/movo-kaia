"use client";

import { usePathname, useRouter } from "next/navigation";
import { memo, useCallback, useMemo } from "react";
import {
  Home,
  LayoutDashboard,
  History,
  Plus,
  User,
  Download,
} from "lucide-react";
import { useAuth } from "@/lib/userContext";

const BottomNavbar = memo(() => {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  // Memoize handlers to prevent re-creation on every render
  const handleNavigation = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router],
  );

  const handleDashboardClick = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  const handleCreateEscrowClick = useCallback(() => {
    router.push("/create-escrow");
  }, [router]);

  const handleProfileClick = useCallback(() => {
    router.push("/profile");
  }, [router]);

  // Memoize middle button to prevent recalculation
  const middleButton = useMemo(() => {
    const isCreateEscrow = pathname === "/create-escrow";

    return {
      id: "create-escrow",
      label: "Create",
      icon: Plus,
      onClick: handleCreateEscrowClick,
      isActive: isCreateEscrow,
    };
  }, [pathname, handleCreateEscrowClick]);

  // Memoize nav items array
  const navItems = useMemo(
    () => [
      {
        id: "home",
        label: "Home",
        icon: Home,
        onClick: () => handleNavigation("/home"),
        isActive: pathname === "/home",
        disabled: false,
      },
      {
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        onClick: handleDashboardClick,
        isActive:
          pathname === "/dashboard" || pathname.startsWith("/dashboard"),
        disabled: false,
      },
      {
        ...middleButton,
        disabled: false,
      },
      {
        id: "history",
        label: "History",
        icon: History,
        onClick: () => {
          router.push("/history");
        }, // Disabled - no action
        isActive: false,
        disabled: false,
      },
      {
        id: "profile",
        label: "Profile",
        icon: User,
        onClick: handleProfileClick,
        isActive: pathname === "/profile",
        disabled: false,
      },
    ],
    [
      pathname,
      handleNavigation,
      handleDashboardClick,
      handleProfileClick,
      middleButton,
    ],
  );

  // Memoize active index calculation
  const activeIndex = useMemo(
    () => navItems.findIndex((item) => item.isActive),
    [navItems],
  );

  // Memoize style calculations
  const floatingButtonStyle = useMemo(
    () => ({
      left: `calc(${activeIndex * 20 + 10}% - 1.75rem)`,
    }),
    [activeIndex],
  );

  const cutoutStyle = useMemo(
    () => ({
      left: `calc(${activeIndex * 20 + 10}% - 2rem)`,
      clipPath: "ellipse(32px 8px at 50% 100%)",
      backgroundColor: "transparent",
      boxShadow: "inset 0 3px 0 0 rgb(17 24 39 / 0.95)",
    }),
    [activeIndex],
  );

  const labelStyle = useMemo(
    () => ({
      left: `calc(${activeIndex * 20 + 10}% - 2rem)`,
      width: "4rem",
    }),
    [activeIndex],
  );

  const glowStyle = useMemo(
    () => ({
      left: `calc(${activeIndex * 20 + 10}% - 2.5rem)`,
    }),
    [activeIndex],
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="relative">
        {/* Floating active button */}
        {activeIndex !== -1 && (
          <div
            className="absolute -top-6 w-14 h-14 bg-gradient-to-br from-cyan-400 via-cyan-500 to-blue-600 rounded-full flex items-center justify-center shadow-2xl shadow-cyan-500/50 border-4 border-gray-900 transition-transform duration-300 ease-out z-10"
            style={floatingButtonStyle}
          >
            {navItems[activeIndex] &&
              (() => {
                const IconComponent = navItems[activeIndex].icon;
                return <IconComponent className="w-7 h-7 text-white" />;
              })()}
          </div>
        )}

        {/* Curved cutout */}
        {activeIndex !== -1 && (
          <div
            className="absolute -top-2 w-16 h-4 bg-transparent transition-transform duration-1500 ease-in-out"
            style={cutoutStyle}
          />
        )}

        {/* Navbar background */}
        <nav className="bg-gradient-to-r from-gray-900/95 via-black/95 to-gray-900/95 backdrop-blur-xl border-t border-white/10 shadow-2xl">
          <div className="flex items-center justify-around py-3 px-2 pb-safe relative">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = item.isActive;
              const isDisabled = item.disabled;

              return (
                <div
                  key={item.id}
                  className="relative flex-1 flex justify-center"
                >
                  <button
                    onClick={isDisabled ? undefined : item.onClick}
                    disabled={isDisabled}
                    className={`flex flex-col items-center justify-center py-2 px-2 rounded-xl transition-all duration-200 ease-out ${
                      isActive
                        ? "text-transparent opacity-30"
                        : isDisabled
                          ? "text-gray-600 cursor-not-allowed opacity-50"
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

        {/* Active label */}
        {activeIndex !== -1 && (
          <div
            className="absolute top-10 text-center transition-transform duration-300 ease-out"
            style={labelStyle}
          >
            <span className="text-xs font-semibold text-cyan-300 drop-shadow-sm">
              {navItems[activeIndex]?.label}
            </span>
          </div>
        )}

        {/* Glow effect */}
        {activeIndex !== -1 && (
          <div
            className="absolute -top-8 w-20 h-8 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent rounded-full blur-2xl transition-transform duration-300 ease-out"
            style={glowStyle}
          />
        )}
      </div>
    </div>
  );
});

BottomNavbar.displayName = "BottomNavbar";

export default BottomNavbar;
