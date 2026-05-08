import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0f1117",
          secondary: "#131720",
        },
        border: "#1e2433",
        accent: "#4f46e5",
        "accent-light": "#818cf8",
        "accent-active": "#1e1b4b",
        text: {
          primary: "#f1f5f9",
          muted: "#64748b",
        },
        criticality: {
          critical: "#f87171",
          "critical-bg": "#3b1a1a",
          high: "#fb923c",
          "high-bg": "#2d1f0e",
          medium: "#86efac",
          "medium-bg": "#1f2a1a",
          low: "#7dd3fc",
          "low-bg": "#0f1f2a",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        card: "10px",
        badge: "8px",
      },
      borderWidth: {
        thin: "0.5px",
      },
    },
  },
  plugins: [],
};

export default config;
