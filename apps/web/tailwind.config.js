/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: "#F0B429",
          50: "#FEF6E0",
          100: "#FCEBBB",
          400: "#F7C948",
          500: "#F0B429",
          600: "#DE911D",
          700: "#CB6E17",
        },
        dark: {
          900: "#050508",
          800: "#0a0a0f",
          700: "#111118",
          600: "#1a1a24",
          500: "#252533",
        },
        win: "#22c55e",
        lose: "#ef4444",
      },
      fontFamily: {
        heading: ["'Bebas Neue'", "Impact", "sans-serif"],
        body: ["'Rajdhani'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        gold: "0 0 20px rgba(240,180,41,0.35)",
        "gold-lg": "0 0 40px rgba(240,180,41,0.45)",
        "win-glow": "0 0 24px rgba(34,197,94,0.5)",
        "lose-glow": "0 0 24px rgba(239,68,68,0.5)",
        glass: "0 8px 32px rgba(0,0,0,0.6)",
      },
      backgroundImage: {
        "gold-gradient": "linear-gradient(135deg, #FEF6E0 0%, #F0B429 45%, #CB6E17 100%)",
        "dark-radial": "radial-gradient(circle at 50% 0%, #111118 0%, #050508 70%)",
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-150%)" },
          "100%": { transform: "translateX(150%)" },
        },
        breathe: {
          "0%, 100%": { boxShadow: "0 0 8px rgba(240,180,41,0.25)" },
          "50%": { boxShadow: "0 0 28px rgba(240,180,41,0.6)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.4", transform: "scale(0.8)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "flip-coin": {
          "0%": { transform: "rotateY(0deg)" },
          "100%": { transform: "rotateY(360deg)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        shimmer: "shimmer 2.5s infinite",
        breathe: "breathe 3s ease-in-out infinite",
        "pulse-dot": "pulse-dot 1.4s ease-in-out infinite",
        marquee: "marquee 30s linear infinite",
        "flip-coin": "flip-coin 1.2s ease-in-out",
        float: "float 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
