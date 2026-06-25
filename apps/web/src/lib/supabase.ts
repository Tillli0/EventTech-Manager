import { createClient } from "@supabase/supabase-js";

// Ohne VITE_SUPABASE_URL die Backend-Adresse aus dem Hostnamen ableiten, über
// den die App selbst aufgerufen wurde (LAN-IP, Tailscale-IP oder -Hostname).
// So funktioniert ein- und dieselbe .env egal ob man im WLAN oder per
// Tailscale auf den Dev-Server zugreift, statt eine feste IP zu hinterlegen.
function inferSupabaseUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return `http://${window.location.hostname}:54321`;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || inferSupabaseUrl();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Bewusst laut scheitern statt stillschweigend mit leeren Daten weiterzulaufen —
  // ein falsch konfiguriertes .env führt sonst zu verwirrenden "leere Liste"-Bugs.
  throw new Error(
    "Supabase-Konfiguration fehlt. Bitte VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY in .env setzen.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
