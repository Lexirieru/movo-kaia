"use client";

import { Search, Filter, Calendar } from "lucide-react";

interface FilterOption {
  value: string;
  label: string;
}

interface SearchFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  statusFilter?: {
    value: string;
    options: FilterOption[];
    onChange: (value: string) => void;
  };
  dateFilter?: {
    value: string;
    options: FilterOption[];
    onChange: (value: string) => void;
  };
  rightContent?: React.ReactNode;
}

export default function SearchFilterBar({
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Search...",
  statusFilter,
  dateFilter,
  rightContent
}: SearchFilterBarProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
        />
      </div>

      <div className="flex items-center space-x-3">
        {statusFilter && (
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter.value}
              onChange={(e) => statusFilter.onChange(e.target.value)}
              className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              {statusFilter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {dateFilter && (
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <select
              value={dateFilter.value}
              onChange={(e) => dateFilter.onChange(e.target.value)}
              className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              {dateFilter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {rightContent}
      </div>
    </div>
  );
}