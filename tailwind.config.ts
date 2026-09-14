import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#08090a",
        panel: "#0f1011",
        surface2: "#191a1b",
        accent: "#5e6ad2",
        accent2: "#7170ff",
        accent3: "#828fff",
        txt: "#f7f8f8",
        txt2: "#d0d6e0",
        txt3: "#8a8f98",
        txt4: "#62666d",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;