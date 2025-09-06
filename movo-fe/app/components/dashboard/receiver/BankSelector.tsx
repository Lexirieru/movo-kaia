import { Building2, X } from "lucide-react";
import { bankDictionary } from "@/lib/dictionary";

interface BankSelectorProps {
  onSelect: (bankName: string) => void;
  onClose: () => void;
}

export default function BankSelector({ onSelect, onClose }: BankSelectorProps) {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black z-70 flex flex-col">
      <div className="flex justify-between items-center p-6 border-b border-white/10">
        <h3 className="text-white text-xl font-semibold">Select Bank</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-2 max-w-lg mx-auto">
          {Object.keys(bankDictionary).map((bankName) => (
            <button
              key={bankName}
              onClick={() => onSelect(bankName)}
              className="w-full p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors flex items-center space-x-4 text-left"
            >
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-white font-medium">{bankName}</div>
                <div className="text-gray-400 text-sm">Code: {bankDictionary[bankName]}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
