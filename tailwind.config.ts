import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ["'Plus Jakarta Sans'", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        ink: { 950: "#14161A", 900: "#1C1F24", 700: "#3B4049", 500: "#6B717C", 400: "#8E949E", 300: "#B9BEC6" },
        line: "#ECEDEF",
        canvas: "#FAFAF8",
        brand: { 50: "#FFF3EF", 100: "#FFE3DA", 200: "#FFC6B4", 500: "#F2603F", 600: "#DE4A2A", 700: "#B93A1F" },
        sage: { 50: "#EFF7F1", 500: "#3F9A63", 700: "#2B6E46" },
        amber: { 50: "#FFF7E6", 500: "#D9921A", 700: "#9A6510" },
        sky: { 50: "#EEF5FF", 500: "#3B7BE0", 700: "#2457A8" },
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,22,26,0.04), 0 4px 16px rgba(20,22,26,0.04)",
        lift: "0 2px 4px rgba(20,22,26,0.05), 0 12px 32px rgba(20,22,26,0.08)",
      },
      borderRadius: { xl2: "1.125rem" },
    },
  },
  plugins: [],
} satisfies Config;
