"use client";
// src/components/loading/LoadingScreen.tsx
import { useEffect, useState } from "react";
import Image from "next/image";

interface LoadingScreenProps {
  onComplete: () => void;
  duration?: number; // ms before auto-completing
}

const STEPS = [
  "Initializing system…",
  "Loading community data…",
  "Setting up secure connection…",
  "Almost ready…",
];

export default function LoadingScreen({ onComplete, duration = 3200 }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [logoVisible, setLogoVisible] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);

  useEffect(() => {
    // Stagger logo entrance
    const logoTimer = setTimeout(() => setLogoVisible(true), 100);
    const contentTimer = setTimeout(() => setContentVisible(true), 600);

    // Animate progress bar
    const totalSteps = 100;
    const stepDuration = duration / totalSteps;
    let current = 0;

    const progressInterval = setInterval(() => {
      current += 1;
      setProgress(current);

      // Cycle through status messages
      const idx = Math.floor((current / 100) * STEPS.length);
      setStepIndex(Math.min(idx, STEPS.length - 1));

      if (current >= 100) {
        clearInterval(progressInterval);
        setTimeout(() => {
          setFadeOut(true);
          setTimeout(onComplete, 600);
        }, 300);
      }
    }, stepDuration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(logoTimer);
      clearTimeout(contentTimer);
    };
  }, [duration, onComplete]);

  return (
    <div
      className={`
        fixed inset-0 z-[9999] flex flex-col items-center justify-center
        bg-gradient-to-br from-[#0a1628] via-[#0d2137] to-[#061220]
        transition-opacity duration-700
        ${fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"}
      `}
    >
      {/* Animated background rings */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-brand-600/10 animate-ping" style={{ animationDuration: "3s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-brand-500/15 animate-ping" style={{ animationDuration: "2s", animationDelay: "0.5s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full border border-brand-400/20 animate-ping" style={{ animationDuration: "1.5s", animationDelay: "1s" }} />
        {/* Floating particles */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-brand-500/20"
            style={{
              width: `${Math.random() * 6 + 2}px`,
              height: `${Math.random() * 6 + 2}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `pulse-glow ${2 + Math.random() * 2}s ease-in-out ${Math.random() * 2}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center px-8 w-full max-w-sm">

        {/* Logo container with glow */}
        <div
          className={`
            relative mb-6 transition-all duration-700
            ${logoVisible ? "opacity-100 scale-100" : "opacity-0 scale-75"}
          `}
        >
          {/* Outer glow ring */}
          <div className="absolute inset-0 -m-4 rounded-full bg-brand-500/20 blur-xl animate-pulse" />

          {/* Logo wrapper */}
          <div className="relative h-28 w-28 rounded-3xl overflow-hidden shadow-2xl border-2 border-brand-500/40 bg-white/5 backdrop-blur-sm flex items-center justify-center">
            <Image
              src="/assets/images/logo/lsh-logo.png"
              alt="Lubao Share Hub Logo"
              width={96}
              height={96}
              className="object-contain p-2"
              priority
              onError={(e) => {
                // Fallback if image not found
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            {/* Fallback text logo */}
            <div className="absolute inset-0 flex items-center justify-center text-brand-400 font-black text-4xl font-display select-none">
              L
            </div>
          </div>
        </div>

        {/* App name & tagline */}
        <div
          className={`
            text-center mb-1 transition-all duration-700 delay-300
            ${contentVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
          `}
        >
          <h1 className="text-2xl font-black text-white tracking-tight font-display leading-tight">
            Lubao Community
          </h1>
          <h1 className="text-2xl font-black text-brand-400 tracking-tight font-display leading-tight">
            Share Hub
          </h1>
        </div>

        {/* Version badge */}
        <div
          className={`
            mb-8 transition-all duration-700 delay-500
            ${contentVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
          `}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/40 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-400">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
            VERSION 2.0.0
          </span>
        </div>

        {/* Progress section */}
        <div
          className={`
            w-full transition-all duration-700 delay-700
            ${contentVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
          `}
        >
          {/* Status text */}
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs text-slate-400 font-medium">{STEPS[stepIndex]}</p>
            <p className="text-xs text-brand-400 font-bold tabular-nums">{progress}%</p>
          </div>

          {/* Progress track */}
          <div className="h-1.5 w-full rounded-full bg-slate-700/60 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-150 ease-out relative overflow-hidden"
              style={{ width: `${progress}%` }}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_1.5s_ease-in-out_infinite]" />
            </div>
          </div>

          {/* Loading dots */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <div className="h-2 w-2 rounded-full bg-brand-500 animate-dot-1" />
            <div className="h-2 w-2 rounded-full bg-brand-400 animate-dot-2" />
            <div className="h-2 w-2 rounded-full bg-brand-300 animate-dot-3" />
          </div>
        </div>
      </div>

      {/* Footer text */}
      <div
        className={`
          absolute bottom-8 text-center transition-all duration-700 delay-1000
          ${contentVisible ? "opacity-100" : "opacity-0"}
        `}
      >
        <p className="text-xs text-slate-600">Lubao, Pampanga · Community Tool Sharing</p>
      </div>
    </div>
  );
}
