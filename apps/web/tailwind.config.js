/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0F1115",
          surface: "#171A21",
          raised: "#1D212B",
        },
        border: {
          DEFAULT: "#262B36",
          subtle: "#1D212B",
        },
        ink: {
          DEFAULT: "#E8EAED",
          muted: "#8B92A3",
          faint: "#5B6273",
        },
        accent: {
          DEFAULT: "#6366F1",
          hover: "#4F46E5",
          soft: "#1E2147",
        },
        status: {
          verfuegbar: "#22C55E",
          "verfuegbar-bg": "#142a1c",
          ausgeliehen: "#3B82F6",
          "ausgeliehen-bg": "#11203b",
          defekt: "#EF4444",
          "defekt-bg": "#2c1414",
          wartung: "#F59E0B",
          "wartung-bg": "#2c2110",
        },
        job: {
          anfrage: "#8B92A3",
          bestaetigt: "#3B82F6",
          laeuft: "#F59E0B",
          abgeschlossen: "#22C55E",
          storniert: "#EF4444",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "10px",
      },
    },
  },
  plugins: [],
};
