"use client";
// src/contexts/ThemeContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggleTheme: () => {},
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read saved preference
    const saved = localStorage.getItem("lsh-theme") as Theme | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved: Theme = saved ?? (prefersDark ? "dark" : "light");
    setTheme(resolved);
    applyTheme(resolved);
    setMounted(true);
  }, []);

  const applyTheme = (t: Theme) => {
    const root = document.documentElement;
    if (t === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  };

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "light" ? "dark" : "light";
      localStorage.setItem("lsh-theme", next);
      applyTheme(next);
      return next;
    });
  }, []);

  // Prevent flash of wrong theme
  if (!mounted) {
    return (
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              const t = localStorage.getItem('lsh-theme');
              const d = window.matchMedia('(prefers-color-scheme: dark)').matches;
              if (t === 'dark' || (!t && d)) document.documentElement.classList.add('dark');
            })()
          `,
        }}
      />
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
