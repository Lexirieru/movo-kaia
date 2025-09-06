"use client";

import { useState } from "react";

import AuthBackground from "./components/AuthBackground";
import AuthCard from "./components/AuthCard";

export default function AuthPage() {
  const [isLoginView, setIsLoginView] = useState(true);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <AuthBackground />
      <AuthCard 
        isLoginView={isLoginView} 
        setIsLoginView={setIsLoginView} 
      />
    </section>
  );
}