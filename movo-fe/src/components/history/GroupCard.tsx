"use client";

import { GroupOfUser } from "@/types/receiverInGroupTemplate";
import { Users, DollarSign } from "lucide-react";

interface GroupCardProps {
  group: GroupOfUser;
  onClick: (groupId: string) => void;
}

export default function GroupCard({ group, onClick }: GroupCardProps) {
  return (
    <div
      onClick={() => onClick(group.groupId)}
      className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:bg-gray-800/70 transition-all duration-300 cursor-pointer hover:scale-105"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">
            {group.nameOfGroup}
          </h3>
          <p className="text-xs text-gray-400">
            ID: {group.groupId.slice(0, 8)}...
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center space-x-1 text-green-400">
            <Users className="w-4 h-4" />
            <span className="text-sm">{group.totalReceiver || 0}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">Recipients:</span>
          <span className="text-white text-sm">
            {group.Receivers?.length || 0}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700/50">
        <div className="flex items-center space-x-2 text-cyan-400">
          <DollarSign className="w-4 h-4" />
          <span className="text-sm">View Details</span>
        </div>
      </div>
    </div>
  );
}
