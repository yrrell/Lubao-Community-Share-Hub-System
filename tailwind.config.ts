import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "ui-sans-serif", "system-ui"],
        display: ["Sora", "ui-sans-serif"],
      },
      screens: {
        xs: "375px",
      },
      keyframes: {
        "fade-in": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        "slide-up": { "0%": { opacity: "0", transform: "translateY(20px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "scale-in": { "0%": { opacity: "0", transform: "scale(0.85)" }, "100%": { opacity: "1", transform: "scale(1)" } },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px 4px rgba(22,163,74,0.3)" },
          "50%": { boxShadow: "0 0 40px 8px rgba(22,163,74,0.6)" },
        },
        "spin-slow": { "0%": { transform: "rotate(0deg)" }, "100%": { transform: "rotate(360deg)" } },
        "loading-bar": { "0%": { width: "0%" }, "100%": { width: "100%" } },
        "dot-bounce": {
          "0%, 80%, 100%": { transform: "scale(0.6)", opacity: "0.4" },
          "40%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.6s ease-out forwards",
        "slide-up": "slide-up 0.7s ease-out forwards",
        "scale-in": "scale-in 0.5s ease-out forwards",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "spin-slow": "spin-slow 3s linear infinite",
        "loading-bar": "loading-bar 2.5s ease-in-out forwards",
        "dot-1": "dot-bounce 1.2s ease-in-out infinite",
        "dot-2": "dot-bounce 1.2s ease-in-out 0.2s infinite",
        "dot-3": "dot-bounce 1.2s ease-in-out 0.4s infinite",
      },
    },
  },
  plugins: [],
};

export default config;

export default config;
