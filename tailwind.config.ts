import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/config/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        portal: {
          bg: "#F9FAFB",
          slate: "#FFFFFF",
          ink: "#0F172A",
          muted: "#334155",
          indigo: "#4F46E5",
          blue: "#2563EB",
        },
        mech: {
          bg: "#F9FAFB",
          panel: "#FFFFFF",
          steel: "#F8FAFC",
          line: "#E2E8F0",
          cyan: "#0F172A",
          "cyan-dim": "#475569",
          amber: "#D97706",
          lime: "#059669",
          danger: "#DC2626",
          mist: "#64748B",
        },
        glass: {
          DEFAULT: "#FFFFFF",
          soft: "#F8FAFC",
          strong: "#FFFFFF",
          border: "#E2E8F0",
          "border-soft": "#F1F5F9",
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Inter",
          "PingFang SC",
          "Microsoft YaHei",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        glass: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)",
        "glass-sm": "0 1px 2px rgba(15, 23, 42, 0.04)",
        glow: "0 8px 24px rgba(15, 23, 42, 0.08)",
        "glow-blue": "0 8px 24px rgba(37, 99, 235, 0.12)",
        "glow-amber": "0 8px 24px rgba(217, 119, 6, 0.1)",
      },
      backdropBlur: {
        glass: "12px",
      },
      backgroundImage: {
        "portal-radial": "none",
        "text-gradient": "linear-gradient(90deg, #0F172A, #334155)",
        "mech-grid": "none",
      },
      transitionDuration: {
        portal: "200ms",
      },
      transitionTimingFunction: {
        portal: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
