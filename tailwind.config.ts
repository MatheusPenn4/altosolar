import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1.25rem", lg: "2rem" },
      screens: { "2xl": "1240px" },
    },
    extend: {
      colors: {
        ink: {
          950: "#050505",
          900: "#0B0B0B",
          800: "#101010",
          700: "#161616",
        },
        brand: {
          blue: "#00AFFF",
          cyan: "#00D4FF",
          amber: "#FFA500",
          gold: "#FFC107",
        },
        muted: "#BDBDBD",
        hair: "rgba(255,255,255,0.08)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-sora)", "var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(0,175,255,0.45)",
        "glow-amber": "0 0 40px -10px rgba(255,165,0,0.45)",
        card: "0 20px 60px -20px rgba(0,0,0,0.7)",
      },
      backgroundImage: {
        "grad-blue": "linear-gradient(135deg,#00AFFF 0%,#00D4FF 100%)",
        "grad-amber": "linear-gradient(135deg,#FFA500 0%,#FFC107 100%)",
        "grad-mix": "linear-gradient(135deg,#00D4FF 0%,#FFC107 100%)",
      },
      keyframes: {
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-pin": {
          "0%,100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(1.6)" },
        },
      },
      animation: {
        marquee: "marquee 32s linear infinite",
        float: "float 6s ease-in-out infinite",
        "pulse-pin": "pulse-pin 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
