import { Github, Chrome } from "lucide-react";

export default function SocialLogin() {
  return (
    <>
      {/* Divider */}
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-600"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-transparent text-gray-400">or continue with</span>
        </div>
      </div>

      {/* Social login buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          className="flex items-center justify-center px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-200 group"
        >
          <Github className="h-5 w-5 text-gray-300 group-hover:text-white transition-colors duration-200" />
          <span className="ml-2 text-sm text-gray-300 group-hover:text-white transition-colors duration-200">GitHub</span>
        </button>
        <button
          type="button"
          className="flex items-center justify-center px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-200 group"
        >
          <Chrome className="h-5 w-5 text-gray-300 group-hover:text-white transition-colors duration-200" />
          <span className="ml-2 text-sm text-gray-300 group-hover:text-white transition-colors duration-200">Google</span>
        </button>
      </div>
    </>
  );
}