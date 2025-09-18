import { Search, Filter } from "lucide-react";

interface GroupFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterType: string;
  onFilterChange: (value: string) => void;
}

export default function GroupFilterBar({ 
  searchTerm, 
  onSearchChange, 
  filterType, 
  onFilterChange 
}: GroupFilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
      <div className="relative flex-1 w-full sm:max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
        <input
          type="text"
          placeholder="Search groups, recipients..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Filter className="w-5 h-5 text-white/60" />
        <select
          value={filterType}
          onChange={(e) => onFilterChange(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        >
          <option value="all">All Groups</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
      </div>
    </div>
  );
}
