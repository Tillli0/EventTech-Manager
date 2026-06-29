// EventTech Manager — Öffentliche Lead-Annahme (Edge Function)
//
// Nimmt Einsendungen des Kontaktformulars der Firmen-Website (Lovable) an und
// schreibt sie per Service-Role (RLS-Bypass) in die Tabelle `website_leads`.
// Öffentlich erreichbar OHNE Login: verify_jwt ist in config.toml abgeschaltet
// (Website-Besucher senden kein JWT). Es wird ausschließlich in website_leads
// geschrieben — sonst ist nichts vom Backend exponiert.
//
// Spam-Schutz: verstecktes Honeypot-Feld `website` (Bots füllen es aus → wir
// antworten still mit 200 ohne Insert). Pflicht: Name + (E-Mail oder Telefon).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Browser-Origins, die das Formular abschicken dürfen. Reflektiert die echte
// Origin (nötig, damit der Browser die Antwort akzeptiert); unbekannte Origins
// bekommen die Hauptdomain → ihr Request wird vom Browser geblockt.
const PRIMARY_ORIGIN = "https://eventtechnik-fk.de";
function isAllowedOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname;
    return (
      host === "eventtechnik-fk.de" ||
      host.endsWith(".eventtechnik-fk.de") ||
      host.endsWith(".lovable.app") ||
      host.endsWith(".lovableproject.com")
    );
  } catch {
    return false;
  }
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && isAllowedOrigin(origin) ? origin : PRIMARY_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

// String trimmen, leer → null, auf maxLen kürzen.
function clean(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return json({ error: "Nur POST erlaubt." }, 405, origin);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Ungültiges JSON." }, 400, origin);
  }

  // Honeypot: echte Nutzer lassen das versteckte Feld leer. Befüllt → still ok.
  if (clean(payload.website, 100)) {
    return json({ ok: true }, 200, origin);
  }

  const name = clean(payload.name, 200);
  const email = clean(payload.email, 320);
  const phone = clean(payload.phone, 60);
  if (!name) {
    return json({ error: "Name ist erforderlich." }, 400, origin);
  }
  if (!email && !phone) {
    return json({ error: "E-Mail oder Telefon ist erforderlich." }, 400, origin);
  }

  // event_date nur übernehmen, wenn es wie ein ISO-Datum aussieht.
  const rawDate = clean(payload.event_date, 10);
  const eventDate = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : null;

  const lead = {
    name,
    email,
    phone,
    company: clean(payload.company, 200),
    event_date: eventDate,
    event_type: clean(payload.event_type, 200),
    message: clean(payload.message, 5000),
  };

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin.from("website_leads").insert(lead);
  if (error) {
    console.error("website_leads insert fehlgeschlagen:", error.message);
    return json({ error: "Konnte nicht gespeichert werden." }, 500, origin);
  }

  return json({ ok: true }, 200, origin);
});
