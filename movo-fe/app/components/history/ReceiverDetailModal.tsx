"use client";
import { X } from "lucide-react";
interface ReceiverDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiver: any;
  nameOfGroup: string;
}

export default function ReceiverDetailModal({
  isOpen,
  onClose,
  receiver,
  nameOfGroup,
}: ReceiverDetailModalProps) {
  if (!isOpen || !receiver) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900/95 border border-gray-700/50 rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Receiver Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400"></X>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm">Group</label>
            <p className="text-white font-medium">{nameOfGroup}</p>
          </div>

          <div>
            <label className="text-gray-400 text-sm">Name</label>
            <p className="text-white font-medium">
              {receiver.fullname || "None"}
            </p>
          </div>

          <div>
            <label className="text-gray-400 text-sm">Wallet Address</label>
            <p className="text-white font-mono text-sm break-all">
              {receiver.walletAddress}
            </p>
          </div>

          <div>
            <label className="text-gray-400 text-sm">Amount</label>
            <p className="text-green-400 font-semibold text-lg">
              ${parseFloat(receiver.amount || "0").toFixed(2)}
            </p>
          </div>

          <div>
            <label className="text-gray-400 text-sm">Currency</label>
            <p className="text-white">{receiver.originCurrency || "USDC"}</p>
          </div>

          {receiver.status && (
            <div>
              <label className="text-gray-400 text-sm">Status</label>
              <span
                className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                  receiver.status === "completed"
                    ? "bg-green-500/20 text-green-300"
                    : receiver.status === "pending"
                      ? "bg-yellow-500/20 text-yellow-300"
                      : "bg-gray-500/20 text-gray-300"
                }`}
              >
                {receiver.status}
              </span>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
