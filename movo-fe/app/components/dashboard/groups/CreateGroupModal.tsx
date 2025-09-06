"use client";

import { useState } from "react";
import { X, Users, Plus } from "lucide-react";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (groupData: { groupName: string }) => void;
}

export default function CreateGroupModal({ 
  isOpen, 
  onClose, 
  onCreateGroup 
}: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async () => {
    if (!groupName.trim()) return;
    
    setIsCreating(true);
    
    try {
      await onCreateGroup({ groupName: groupName.trim() });
      // Reset form
      setGroupName("");
    } catch (err) {
      console.error("Failed to create group", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setGroupName("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl border border-white/10 shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Create New Group</h2>
              <p className="text-white/60 text-sm">Start a new payment group</p>
            </div>
          </div>
          
          <button
            onClick={handleClose}
            disabled={isCreating}
            className="text-white/60 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Group Name
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name (e.g., Marketing Team Bonus)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                disabled={isCreating}
                maxLength={100}
                required
              />
              <p className="text-white/40 text-xs mt-1">
                {groupName.length}/100 characters
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Users className="w-3 h-3 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-cyan-400 text-sm font-medium mb-1">Next Steps</h3>
                  <p className="text-white/60 text-xs leading-relaxed">
                    After creating the group, you'll be able to add recipients and configure payment details.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isCreating}
              className="flex-1 bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl font-medium hover:bg-white/10 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            
            <button
              onClick={handleSubmit}
              disabled={!groupName.trim() || isCreating}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-3 rounded-xl font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all disabled:opacity-50 disabled:hover:shadow-none flex items-center justify-center space-x-2 hover:scale-105"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create Group</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Generated ID Preview (for development) */}
        {groupName.trim() && (
          <div className="px-6 pb-6">
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="text-white/60 text-xs mb-1">Generated Group ID Preview:</div>
              <div className="text-white/40 text-xs font-mono">
                group_{Date.now()}_xxxxxxxxx
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}