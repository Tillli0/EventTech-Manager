/** @type {import('tailwindcss').Config} */

// Alle Farben kommen als CSS-Variablen aus src/index.css, damit das Theme ZUR
// LAUFZEIT umschaltbar ist (PLAN-UI-NEUSCHNITT.md, Etappe U2). Vorher standen hier
// feste Hex-Werte — die werden beim Bauen einkompiliert und lassen sich nicht mehr
// wechseln.
//
// Das `<alpha-value>`-Muster erhält die Transparenz-Stufen (bg-accent/10 usw.);
// deshalb stehen die Variablen als "R G B" und nicht als Hex in der CSS.
const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  // Themes laufen über data-theme am <html>, nicht über die dark-Klasse.
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: v("bg"),
          surface: v("bg-surface"),
          raised: v("bg-raised"),
        },
        border: {
          DEFAULT: v("border"),
          subtle: v("border-subtle"),
        },
        ink: {
          DEFAULT: v("ink"),
          muted: v("ink-muted"),
          faint: v("ink-faint"),
        },
        accent: {
          DEFAULT: v("accent"),
          hover: v("accent-hover"),
          soft: v("accent-soft"),
          /** Lesbare Schriftfarbe AUF der Akzentfläche (bei Creme schwarz → weiß). */
          on: v("on-accent"),
        },
        status: {
          verfuegbar: v("status-verfuegbar"),
          "verfuegbar-bg": v("status-verfuegbar-bg"),
          ausgeliehen: v("status-ausgeliehen"),
          "ausgeliehen-bg": v("status-ausgeliehen-bg"),
          defekt: v("status-defekt"),
          "defekt-bg": v("status-defekt-bg"),
          wartung: v("status-wartung"),
          "wartung-bg": v("status-wartung-bg"),
        },
        job: {
          anfrage: v("job-anfrage"),
          bestaetigt: v("job-bestaetigt"),
          planung: v("job-planung"),
          packen: v("job-packen"),
          laeuft: v("job-laeuft"),
          rueckgabe: v("job-rueckgabe"),
          abgeschlossen: v("job-abgeschlossen"),
          storniert: v("job-storniert"),
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
