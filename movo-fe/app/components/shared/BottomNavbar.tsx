"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, LayoutDashboard, History } from "lucide-react";
import { useAuth } from "@/lib/userContext";

export default function BottomNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentRole } = useAuth();

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const handleDashboardClick = () => {
    // Navigate based on user role
    if (currentRole === "receiver") {
      router.push("/dashboard?view=receiver");
    } else {
      router.push("/dashboard?view=sender");
    }
  };

  const handleHistoryClick = () => {
    // Navigate based on user role
    if (currentRole === "receiver") {
      router.push("/history?view=receiver");
    } else {
      router.push("/history?view=sender");
    }
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
      isActive: pathname === "/dashboard",
    },
    {
      id: "history",
      label: "History",
      icon: History,
      onClick: handleHistoryClick,
      isActive: pathname === "/history",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm border-t border-white/10 z-50">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`flex flex-col items-center justify-center py-2 px-4 rounded-lg transition-all duration-200 ${
                item.isActive
                  ? "text-cyan-400 bg-cyan-400/10"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/50"
              }`}
            >
              <IconComponent 
                className={`w-6 h-6 mb-1 ${
                  item.isActive ? "text-cyan-400" : "text-current"
                }`} 
              />
              <span 
                className={`text-xs font-medium ${
                  item.isActive ? "text-cyan-400" : "text-current"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
