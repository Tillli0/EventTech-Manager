import { RotateCw } from "lucide-react";
import { useRouteError } from "react-router-dom";

/**
 * Fängt Render-Fehler jeder Route ab (z.B. wenn eine veraltete Chunk-Datei nach
 * einem Deploy nicht mehr existiert und der `vite:preloadError`-Auto-Reload aus
 * main.tsx aus irgendeinem Grund nicht gegriffen hat). Zeigt statt der rohen
 * React-Router-Fehlerseite einen erklärenden Hinweis mit Neuladen-Button.
 */
export function RouteErrorPage() {
  const error = useRouteError();
  console.error(error);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-4 text-center">
      <p className="text-lg font-semibold text-ink">Neue Version verfügbar</p>
      <p className="max-w-sm text-sm text-ink-muted">
        Die App wurde seit dem letzten Laden aktualisiert. Bitte neu laden, um die
        aktuelle Version zu holen.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
      >
        <RotateCw size={15} />
        Seite neu laden
      </button>
    </div>
  );
}
