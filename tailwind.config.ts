import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // P2PBET dark palette (see /workflow)
        bg: "#0a0a0e",
        surface: {
          DEFAULT: "#121218",
          2: "#16161d",
          3: "#1c1c25"
        },
        line: "#26262f",
        ink: {
          DEFAULT: "#e9e9ef",
          dim: "#9aa0a9",
          muted: "#6a7079"
        },
        brand: {
          purple: "#7c5cff",
          "purple-hover": "#6b4ef0",
          lavender: "#c9b8f6"
        },
        gold: "#e6c46a",
        token: "#34d399"
      },
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "SFMono-Regular",
          "SF Mono",
          "Menlo",
          "Consolas",
          "Liberation Mono",
          "monospace"
        ]
      }
    }
  },
  plugins: []
};

export default config;
