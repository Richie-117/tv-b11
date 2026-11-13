import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // High-contrast clean dark canvas
        background: "#0A0E17",
        surface: {
          DEFAULT: "#111827",
          lighter: "#1E293B",
          card: "#161F30",
          border: "#23324A",
          hover: "#1B263B",
        },
        // Official UCR Blue and Orange Signature Palette
        ucr: {
          orange: "#FF7900",
          "orange-hover": "#E66C00",
          "orange-glow": "rgba(255, 121, 0, 0.2)",
          blue: "#0088FF",
          "blue-hover": "#0072D6",
          "blue-glow": "rgba(0, 136, 255, 0.2)",
          dark: "#0A0E17",
          card: "#161F30",
          border: "#23324A",
        },
        // Legacy play tokens mapped to dark blue & orange for full backwards compatibility
        play: {
          purple: "#0088FF",       // UCR Blue
          "purple-light": "rgba(0, 136, 255, 0.15)",
          "purple-hover": "#0072D6",
          coral: "#FF7900",        // UCR Orange
          "coral-light": "rgba(255, 121, 0, 0.15)",
          yellow: "#F59E0B",       // Amber
          "yellow-light": "rgba(245, 158, 11, 0.15)",
          green: "#10B981",        // Emerald
          "green-light": "rgba(16, 185, 129, 0.15)",
          blue: "#0088FF",         // Blue
          "blue-light": "rgba(0, 136, 255, 0.15)",
          dark: "#0A0E17",
          muted: "#94A3B8",
          subtle: "#64748B",
        },
        brand: {
          primary: "#0088FF",
          accent: "#FF7900",
          emerald: "#10B981",
          amber: "#F59E0B",
          cyan: "#38BDF8",
        },
        text: {
          primary: "#FFFFFF",     // Pure crisp white text for 100% legibility
          secondary: "#94A3B8",   // Slate-400
          muted: "#64748B",       // Slate-500
        },
      },
      fontFamily: {
        sans: [
          "'Plus Jakarta Sans'",
          "'Outfit'",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        heading: [
          "'Outfit'",
          "'Plus Jakarta Sans'",
          "sans-serif",
        ],
      },
      boxShadow: {
        glow: "0 0 20px -3px rgba(0, 136, 255, 0.25)",
        "glow-orange": "0 0 20px -3px rgba(255, 121, 0, 0.25)",
        "nav-float": "0 12px 30px -4px rgba(0, 0, 0, 0.6), 0 0 20px -2px rgba(0, 136, 255, 0.3)",
        card: "0 4px 20px -2px rgba(0, 0, 0, 0.5)",
      },
      borderRadius: {
        "3xl": "24px",
        "4xl": "32px",
      },
    },
  },
  plugins: [],
};

export default config;
