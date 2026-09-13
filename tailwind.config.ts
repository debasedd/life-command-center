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
        surface: "#09090b",
        card: "#18181b",
        card2: "#27272a",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;