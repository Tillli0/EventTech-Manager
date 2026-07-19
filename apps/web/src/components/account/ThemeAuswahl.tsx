import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { THEMES, THEME_LABELS, THEME_HINTS, applyTheme, readStoredTheme, type Theme } from "@/lib/theme";

/**
 * Theme-Auswahl im Konto-Dialog (PLAN-UI-NEUSCHNITT.md, K-B: das Persönliche
 * verbraucht keinen Navigationsplatz).
 *
 * Die Vorschau-Kacheln zeigen die Farben **fest**, nicht über die Tokens — sie
 * sollen ja alle drei Themes gleichzeitig darstellen, unabhängig davon, welches
 * gerade aktiv ist. Das ist die einzige Stelle, an der feste Farbwerte richtig
 * sind; überall sonst gilt weiterhin: nur Tokens.
 */
const VORSCHAU: Record<Theme, { flaeche: string; karte: string; schrift: string; akzent: string }> = {
  creme: { flaeche: "#F2EFE9", karte: "#FFFFFF", schrift: "#1A1815", akzent: "#1F1D1A" },
  weiss: { flaeche: "#F6F7FA", karte: "#FFFFFF", schrift: "#14161C", akzent: "#4F46E5" },
  dark: { flaeche: "#0F1115", karte: "#171A21", schrift: "#E8EAED", akzent: "#6366F1" },
};

export function ThemeAuswahl() {
  const [aktiv, setAktiv] = useState<Theme>(() => readStoredTheme());

  function waehle(theme: Theme) {
    applyTheme(theme);
    setAktiv(theme);
  }

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div>
        <p className="text-sm font-medium text-ink">Darstellung</p>
        <p className="text-xs text-ink-muted">Gilt nur auf diesem Gerät.</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {THEMES.map((theme) => {
          const v = VORSCHAU[theme];
          const gewaehlt = aktiv === theme;
          return (
            <button
              key={theme}
              type="button"
              onClick={() => waehle(theme)}
              aria-pressed={gewaehlt}
              className={cn(
                "rounded-lg border p-2 text-left transition-colors",
                gewaehlt ? "border-accent ring-1 ring-accent" : "border-border hover:bg-bg-raised",
              )}
            >
              {/* Miniatur: Fläche, Karte, Akzent — zeigt den Charakter auf einen Blick. */}
              <span
                className="mb-2 flex h-12 items-end gap-1 rounded-md p-1.5"
                style={{ backgroundColor: v.flaeche }}
                aria-hidden
              >
                <span className="h-full flex-1 rounded" style={{ backgroundColor: v.karte }} />
                <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: v.akzent }} />
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-ink">{THEME_LABELS[theme]}</span>
                {gewaehlt && <Check size={14} className="text-accent" aria-hidden />}
              </span>
              <span className="mt-0.5 block text-xs text-ink-faint">{THEME_HINTS[theme]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
