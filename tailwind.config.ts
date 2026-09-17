import type { Config } from "tailwindcss";

// White minimal — semantic names over CSS variables (globals.css).
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "var(--ui-canvas)",
        surface: "var(--ui-surface)",
        mutedSurface: "var(--ui-surface-muted)",
        ink: "var(--ui-text)",
        soft: "var(--ui-text-soft)",
        muted: "var(--ui-text-muted)",
        line: "var(--ui-border)",
        lineStrong: "var(--ui-border-strong)",
        primary: "var(--ui-primary)",
        positive: "var(--ui-positive)",
        warning: "var(--ui-warning)",
        danger: "var(--ui-danger)",
        focus: "var(--ui-focus-ring)",
      },
      borderRadius: {
        control: "9px",
        card: "14px",
        panel: "20px",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
        spring: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
