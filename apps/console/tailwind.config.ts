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
          DEFAULT: "#520061",
          light: "#6B1953",
        },
        success: "#00AD6E",
        danger: "#EF4444",
        warning: "#F59E0B",
        pending: "#3B82F6",
      },
    },
  },
  plugins: [],
};

export default config;
