"use client";

interface LoadingStateProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
}

export default function LoadingState({ 
  message = "Loading...", 
  size = "md",
  fullScreen = false 
}: LoadingStateProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12", 
    lg: "h-16 w-16"
  };

  const containerClasses = fullScreen 
    ? "min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center"
    : "text-center py-12";

  return (
    <div className={containerClasses}>
      <div className="text-center">
        <div className={`animate-spin rounded-full ${sizeClasses[size]} border-b-2 border-cyan-400 mx-auto mb-4`}></div>
        <p className="text-gray-400">{message}</p>
      </div>
    </div>
  );
}