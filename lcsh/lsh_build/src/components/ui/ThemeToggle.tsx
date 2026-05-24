"use client";
// src/components/ui/ThemeToggle.tsx
import { useTheme } from "@/contexts/ThemeContext";
import { FiSun, FiMoon } from "react-icons/fi";

interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
}

export default function ThemeToggle({ className = "", compact = false }: ThemeToggleProps) {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      className={`
        relative inline-flex items-center gap-2 rounded-xl border
        transition-all duration-300 select-none
        ${isDark
          ? "border-slate-600 bg-slate-800 text-amber-400 hover:bg-slate-700"
          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
        }
        ${compact ? "p-2" : "px-3 py-2 text-sm font-medium"}
        ${className}
      `}
    >
      <span className={`transition-transform duration-300 ${isDark ? "rotate-0" : "-rotate-90"}`}>
        {isDark ? <FiMoon size={16} /> : <FiSun size={16} />}
      </span>
      {!compact && (
        <span className="hidden sm:inline">{isDark ? "Dark" : "Light"}</span>
      )}

      {/* Animated pill indicator */}
      {!compact && (
        <span
          className={`
            inline-flex h-5 w-9 items-center rounded-full transition-all duration-300
            ${isDark ? "bg-brand-600" : "bg-gray-200"}
          `}
        >
          <span
            className={`
              inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-300
              ${isDark ? "translate-x-4" : "translate-x-0.5"}
            `}
          />
        </span>
      )}
    </button>
  );
}
