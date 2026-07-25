// EventTech Manager — Bestell-Mail an Verleiher (Block B / E5)
//
// Verschickt die Mietanfrage für einen Anmiet-Vorgang per Resend an den
// Verleih-Partner und protokolliert den Versand in `subrental_order_emails`.
// V1 ohne PDF-Anhang (E4 liefert das PDF separat für den lokalen Download/die
// eigene Ablage) — hier zählt der Inhalt in der Mail selbst.
//
// Sicherheit:
// * verify_jwt bleibt AN (config.toml) — nur eingeloggte Nutzer.
// * Zusätzlich can_edit_area('anmietung') des Aufrufers geprüft (RLS-Wahrheit).
// * Der Insert ins Versandprotokoll läuft per Service-Role, weil `authenticated`
//   auf subrental_order_emails bewusst nur SELECT hat (kein Vortäuschen von Versand).
// * "Ruhig by default": ohne RESEND_API_KEY-Secret klare Fehlermeldung statt Versand.
//
// Aufruf: POST { subrental_id, preview?: boolean }
// preview: true → Empfänger/Betreff/Text zurückgeben, NICHTS senden (braucht keinen
//          RESEND_API_KEY — so lässt sich die Mail vorab prüfen, Preview-Pflicht in der UI).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatEur(value: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
}

function formatDateDe(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}

const LOGISTICS_LABEL: Record<string, string> = {
  abholung: "Abholung",
  lieferung_lager: "Lieferung ins Lager",
  lieferung_location: "Lieferung zur Location",
};

// deno-lint-ignore no-explicit-any
type AnyClient = any;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Nur POST erlaubt." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Nicht authentifiziert." }, 401);

    // 1) Aufrufer prüfen: eingeloggt + Schreibrecht im Bereich Anmietung.
    const caller: AnyClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await caller.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Ungültige Sitzung." }, 401);

    const { data: mayEdit, error: rightsErr } = await caller.rpc("can_edit_area", { a: "anmietung" });
    if (rightsErr || !mayEdit) {
      return json({ error: "Keine Berechtigung für den Bereich Anmietung." }, 403);
    }

    const body = await req.json();
    const subrentalId = body.subrental_id as string | undefined;
    const preview = body.preview === true;
    if (!subrentalId) return json({ error: "subrental_id fehlt." }, 400);

    // 2) Anmiet-Vorgang mit dem Aufrufer-Client laden (RLS gilt unverändert).
    const { data: subrental, error: subErr } = await caller
      .from("subrentals")
      .select("*, supplier:suppliers(*), items:subrental_items(*)")
      .eq("id", subrentalId)
      .maybeSingle();
    if (subErr) return json({ error: subErr.message }, 400);
    if (!subrental) return json({ error: "Anmiet-Vorgang nicht gefunden." }, 404);

    // 3) Fachliche Prüfungen — bewusst serverseitig, die UI ist nur Komfort.
    if (subrental.status === "storniert") {
      return json({ error: "Ein stornierter Vorgang kann nicht angeschrieben werden." }, 400);
    }
    if (!subrental.order_number) {
      return json(
        { error: "Bitte zuerst das Bestell-PDF erzeugen (vergibt die Bestellnummer)." },
        400,
      );
    }
    const toEmail = (subrental.supplier?.email ?? "").trim();
    if (!toEmail) {
      return json({ error: "Der Verleih-Partner hat keine E-Mail-Adresse hinterlegt." }, 400);
    }
    const items = (subrental.items ?? []) as { description: string; quantity: number }[];
    if (items.length === 0) {
      return json({ error: "Der Vorgang hat noch keine Positionen." }, 400);
    }

    // 4) Mail zusammenbauen (Firmendaten für Absender/Kontakt).
    const { data: company } = await caller
      .from("company_settings")
      .select("name, email, phone")
      .eq("id", true)
      .maybeSingle();
    const companyName = company?.name?.trim() || "EventTech";

    const supplierName = subrental.supplier?.name ?? "";
    const contactPerson = subrental.supplier?.contact_person as string | null;
    const logisticsLabel = LOGISTICS_LABEL[subrental.logistics as string] ?? subrental.logistics;

    const subject = `Mietanfrage ${subrental.order_number}${supplierName ? ` — ${companyName}` : ""}`;

    const itemRows = items
      .map((it) => `<tr><td style="border:1px solid #ddd">${esc(it.description)}</td><td style="border:1px solid #ddd">${it.quantity}</td></tr>`)
      .join("");

    const html =
      `<p>Sehr geehrte${contactPerson ? "r Herr/Frau " + esc(contactPerson) : " Damen und Herren"},</p>` +
      `<p>für die folgende Veranstaltung möchten wir Technik bei Ihnen anfragen:</p>` +
      `<table cellpadding="6" style="border-collapse:collapse">` +
      `<tr><td style="border:1px solid #ddd"><b>Bestellnummer</b></td><td style="border:1px solid #ddd">${esc(String(subrental.order_number))}</td></tr>` +
      `<tr><td style="border:1px solid #ddd"><b>Zeitraum</b></td><td style="border:1px solid #ddd">${esc(formatDateDe(String(subrental.start_date)))} – ${esc(formatDateDe(String(subrental.end_date)))}</td></tr>` +
      `<tr><td style="border:1px solid #ddd"><b>Logistik</b></td><td style="border:1px solid #ddd">${esc(String(logisticsLabel))}</td></tr>` +
      `</table>` +
      `<p><b>Positionen:</b></p>` +
      `<table cellpadding="6" style="border-collapse:collapse">` +
      `<tr><td style="border:1px solid #ddd"><b>Bezeichnung</b></td><td style="border:1px solid #ddd"><b>Menge</b></td></tr>` +
      itemRows +
      `</table>` +
      `<p>Bitte teilen Sie uns mit, ob die Positionen im genannten Zeitraum verfügbar sind.</p>` +
      `<p>Mit freundlichen Grüßen<br>${esc(companyName)}</p>`;

    // Text-Fassung fürs Protokoll (kein HTML — leichter lesbar in der Verlaufs-Anzeige).
    const textBody =
      `Mietanfrage ${subrental.order_number}\n` +
      `Zeitraum: ${formatDateDe(String(subrental.start_date))} – ${formatDateDe(String(subrental.end_date))}\n` +
      `Logistik: ${logisticsLabel}\n\n` +
      `Positionen:\n` +
      items.map((it) => `- ${it.description} (${it.quantity}x)`).join("\n");

    if (preview) {
      return json({ preview: true, to: toEmail, subject, html });
    }

    // 5) Versand über Resend (gleiches Secret wie public-lead/send-dunning).
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      return json(
        { error: "RESEND_API_KEY ist nicht als Supabase-Secret gesetzt — Versand nicht möglich." },
        500,
      );
    }
    const from =
      Deno.env.get("SUBRENTAL_ORDER_FROM") ||
      Deno.env.get("LEAD_NOTIFY_FROM") ||
      `${companyName} <onboarding@resend.dev>`;

    const payload: Record<string, unknown> = { from, to: toEmail, subject, html };
    if (company?.email) payload.reply_to = company.email;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error("Resend-Versand fehlgeschlagen:", res.status, detail);
      return json({ error: `E-Mail-Versand fehlgeschlagen (Resend ${res.status}).` }, 502);
    }

    // 6) Versand protokollieren (Service-Role — authenticated darf hier nur lesen).
    const admin: AnyClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: logErr } = await admin.from("subrental_order_emails").insert({
      subrental_id: subrentalId,
      sent_to: toEmail,
      subject,
      body: textBody,
      sent_by: userData.user.id,
    });
    if (logErr) {
      console.error("subrental_order_emails insert fehlgeschlagen:", logErr.message);
      return json(
        { error: "E-Mail wurde versendet, konnte aber nicht protokolliert werden. Bitte Verlauf prüfen." },
        500,
      );
    }

    // 7) Status auf 'angefragt' setzen — nur beim ersten Anschreiben (aus 'entwurf'),
    // ein späteres Nachfassen darf einen weiter fortgeschrittenen Status nicht zurückdrehen.
    if (subrental.status === "entwurf") {
      const { error: statusErr } = await admin
        .from("subrentals")
        .update({ status: "angefragt" })
        .eq("id", subrentalId);
      if (statusErr) console.error("Status-Update nach Versand fehlgeschlagen:", statusErr.message);
    }

    return json({ ok: true, to: toEmail });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Serverfehler." }, 500);
  }
});
