import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "@/App";
import "@/index.css";

// Nach jedem Deploy ändern sich die Datei-Hashes der Code-Splitting-Chunks
// (Seiten werden per React.lazy nachgeladen). Ein bereits offener Tab versucht
// dann beim Navigieren eine inzwischen nicht mehr existierende Chunk-Datei zu
// laden ("Failed to fetch dynamically imported module"). Vite meldet das über
// dieses Event — wir laden die Seite dann einmalig neu, statt eine
// Fehlerseite zu zeigen. Schutz vor Reload-Schleife per sessionStorage-Flag.
window.addEventListener("vite:preloadError", () => {
  const key = "vite-preload-reload";
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
