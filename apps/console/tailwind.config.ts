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
        navy: {
          DEFAULT: "#1A1A2E",
          light: "#16213E",
        },
        success: "#10B981",
        danger: "#EF4444",
        warning: "#F59E0B",
        pending: "#3B82F6",
      },
    },
  },
  plugins: [],
};

export default config;
