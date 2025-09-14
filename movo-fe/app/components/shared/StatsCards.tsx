"use client";

import { ReactNode } from "react";

interface StatCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  iconBgColor?: string;
  textColor?: string;
}

interface StatsCardsProps {
  stats: StatCardProps[];
  columns?: number;
}

export function StatCard({ 
  icon, 
  value, 
  label, 
  iconBgColor = "bg-blue-500/20", 
  textColor = "text-white" 
}: StatCardProps) {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
      <div className="flex items-center space-x-3">
        <div className={`w-10 h-10 ${iconBgColor} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <div className={`text-2xl font-bold ${textColor}`}>{value}</div>
          <div className="text-gray-400 text-sm">{label}</div>
        </div>
      </div>
    </div>
  );
}

export default function StatsCards({ stats, columns = 4 }: StatsCardsProps) {
  const gridCols = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-3", 
    4: "md:grid-cols-4"
  };

  return (
    <div className={`grid grid-cols-1 ${gridCols[columns as keyof typeof gridCols]} gap-4`}>
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
}