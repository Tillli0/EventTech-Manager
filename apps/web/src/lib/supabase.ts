import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
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
