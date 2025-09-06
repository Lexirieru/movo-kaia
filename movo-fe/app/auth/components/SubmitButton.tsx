import { ArrowRight } from "lucide-react";

interface SubmitButtonProps {
  isLoading: boolean;
  onClick: () => void;
  text: string;
}

export default function SubmitButton({ isLoading, onClick, text }: SubmitButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className="group relative w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="relative flex items-center justify-center">
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span>Please wait...</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2 group-hover:translate-x-1 transition-transform duration-200">
            <span>{text}</span>
            <ArrowRight className="h-5 w-5" />
          </div>
        )}
      </div>
    </button>
  );
}