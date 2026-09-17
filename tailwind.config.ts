import type { Config } from "tailwindcss";

// Violet Rail — semantic color names mapped to CSS variables from globals.css.
// Old Linear-era palette deleted; components consume semantic roles only.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "var(--vr-canvas)",
        surface: "var(--vr-surface)",
        raised: "var(--vr-surface-raised)",
        mutedSurface: "var(--vr-surface-muted)",
        ink: "var(--vr-text)",
        soft: "var(--vr-text-soft)",
        muted: "var(--vr-text-muted)",
        line: "var(--vr-border)",
        lineSoft: "var(--vr-border-soft)",
        primary: "var(--vr-primary)",
        accent: "var(--vr-accent)",
        positive: "var(--vr-positive)",
        warning: "var(--vr-warning)",
        danger: "var(--vr-danger)",
        focus: "var(--vr-focus-ring)",
        magenta: "var(--vr-magenta)",
        cyan: "var(--vr-cyan)",
      },
      borderRadius: {
        control: "6px",
        card: "8px",
        panel: "12px",
      },
      transitionTimingFunction: {
        flow: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
