import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#101820",
        panel: "#f6f8fb",
        court: "#d97706",
        signal: "#0f766e",
        miss: "#b91c1c",
        make: "#15803d",
        navy: "#162033"
      },
      boxShadow: {
        card: "0 12px 34px rgba(16, 24, 32, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
