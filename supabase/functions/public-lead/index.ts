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

// Absender-IP (hinter Cloudflare) bestimmen.
function clientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    "unknown"
  );
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Max. Einsendungen pro IP und Stunde (Spam-Drosselung zusätzlich zum Honeypot).
const RATE_LIMIT_PER_HOUR = 8;

// Best-effort-Benachrichtigung per Resend, wenn RESEND_API_KEY + LEAD_NOTIFY_TO
// als Function-Secrets gesetzt sind. Fehler brechen die Lead-Annahme NICHT ab.
async function notifyNewLead(lead: {
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  event_date: string | null;
  event_type: string | null;
  message: string | null;
}): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const to = Deno.env.get("LEAD_NOTIFY_TO");
  if (!apiKey || !to) return;
  const from = Deno.env.get("LEAD_NOTIFY_FROM") || "EventTech Anfragen <onboarding@resend.dev>";

  const rows: [string, string | null][] = [
    ["Name", lead.name],
    ["E-Mail", lead.email],
    ["Telefon", lead.phone],
    ["Firma", lead.company],
    ["Wunschtermin", lead.event_date],
    ["Art", lead.event_type],
    ["Nachricht", lead.message],
  ];
  const html =
    `<h2>Neue Website-Anfrage</h2><table cellpadding="6">` +
    rows
      .filter(([, v]) => v)
      .map(([k, v]) => `<tr><td><b>${k}</b></td><td>${String(v).replace(/</g, "&lt;")}</td></tr>`)
      .join("") +
    `</table><p>Im EventTech-Manager unter Kunden → Website-Anfragen bearbeiten.</p>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject: `Neue Website-Anfrage von ${lead.name}`, html }),
    });
    if (!res.ok) console.error("Resend-Benachrichtigung fehlgeschlagen:", res.status, await res.text());
  } catch (e) {
    console.error("Resend-Benachrichtigung Ausnahme:", e instanceof Error ? e.message : e);
  }
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

  // Rate-Limit: max. RATE_LIMIT_PER_HOUR Einsendungen je IP pro Stunde.
  const ipHash = await sha256Hex(clientIp(req));
  const sinceIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countErr } = await admin
    .from("website_leads")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", sinceIso);
  if (!countErr && (count ?? 0) >= RATE_LIMIT_PER_HOUR) {
    return json({ error: "Zu viele Anfragen. Bitte später erneut versuchen." }, 429, origin);
  }

  const { error } = await admin.from("website_leads").insert({ ...lead, ip_hash: ipHash });
  if (error) {
    console.error("website_leads insert fehlgeschlagen:", error.message);
    return json({ error: "Konnte nicht gespeichert werden." }, 500, origin);
  }

  await notifyNewLead(lead);
  return json({ ok: true }, 200, origin);
});
