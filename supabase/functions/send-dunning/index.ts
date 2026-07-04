// EventTech Manager — Mahnwesen: Zahlungserinnerung/Mahnung versenden (Edge Function)
//
// Verschickt für eine überfällige, gestellte Rechnung die jeweils nächste Mahnstufe
// per Resend an die Kunden-E-Mail und protokolliert den Versand in `invoice_dunnings`.
// Stufen: 1 = Zahlungserinnerung, 2 = 1. Mahnung, 3 = 2. und letzte Mahnung.
//
// Sicherheit:
// * verify_jwt bleibt AN (kein config.toml-Eintrag) — nur eingeloggte Nutzer kommen rein.
// * Zusätzlich wird can_edit_area('angebote') des Aufrufers geprüft (RLS-Wahrheit).
// * Der Insert ins Versandprotokoll läuft per Service-Role, weil `authenticated`
//   auf invoice_dunnings bewusst nur SELECT hat (kein Vortäuschen von Mahnungen).
// * Der Unique-Constraint (invoice_id, level) verhindert Doppelversand derselben Stufe.
//
// Aufruf:  POST { invoice_id, preview?: boolean }
// preview: true → Betreff/HTML/Empfänger/Stufe zurückgeben, NICHTS senden (braucht
//          keinen RESEND_API_KEY — so lässt sich die Mail vorab prüfen).

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

interface DunningLevel {
  label: string;
  subjectPrefix: string;
  intro: string;
  closing: string;
}

// Tonlage steigt pro Stufe; Stufe 3 kündigt weitere Schritte an.
const LEVELS: Record<1 | 2 | 3, DunningLevel> = {
  1: {
    label: "Zahlungserinnerung",
    subjectPrefix: "Zahlungserinnerung",
    intro:
      "sicher ist es Ihrer Aufmerksamkeit entgangen — die folgende Rechnung ist noch offen. " +
      "Wir möchten Sie freundlich an die Zahlung erinnern.",
    closing:
      "Bitte überweisen Sie den offenen Betrag innerhalb der nächsten 7 Tage. " +
      "Sollte sich Ihre Zahlung mit dieser Erinnerung überschnitten haben, betrachten Sie diese Nachricht bitte als gegenstandslos.",
  },
  2: {
    label: "1. Mahnung",
    subjectPrefix: "1. Mahnung",
    intro:
      "trotz unserer Zahlungserinnerung konnten wir bislang keinen Zahlungseingang zu der folgenden Rechnung feststellen.",
    closing:
      "Wir bitten Sie, den offenen Betrag innerhalb von 7 Tagen zu begleichen. " +
      "Sollte die Zahlung bereits erfolgt sein, betrachten Sie diese Mahnung bitte als gegenstandslos.",
  },
  3: {
    label: "2. und letzte Mahnung",
    subjectPrefix: "2. und letzte Mahnung",
    intro:
      "leider ist zu der folgenden Rechnung trotz Erinnerung und Mahnung weiterhin kein Zahlungseingang zu verzeichnen.",
    closing:
      "Wir fordern Sie letztmalig auf, den offenen Betrag innerhalb von 7 Tagen zu begleichen. " +
      "Andernfalls behalten wir uns vor, weitere Schritte einzuleiten. " +
      "Sollte die Zahlung bereits erfolgt sein, betrachten Sie diese Mahnung bitte als gegenstandslos.",
  },
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

    // 1) Aufrufer prüfen: eingeloggt + Schreibrecht im kaufmännischen Bereich.
    const caller: AnyClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await caller.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Ungültige Sitzung." }, 401);

    const { data: mayEdit, error: rightsErr } = await caller.rpc("can_edit_area", { a: "angebote" });
    if (rightsErr || !mayEdit) {
      return json({ error: "Keine Berechtigung für den Bereich Angebote/Rechnungen." }, 403);
    }

    const body = await req.json();
    const invoiceId = body.invoice_id as string | undefined;
    const preview = body.preview === true;
    if (!invoiceId) return json({ error: "invoice_id fehlt." }, 400);

    // 2) Rechnung mit dem Aufrufer-Client laden (RLS gilt unverändert).
    const { data: invoice, error: invErr } = await caller
      .from("invoices")
      .select("*, customer:customers(*), items:invoice_items(*), payments:invoice_payments(*), dunnings:invoice_dunnings(*)")
      .eq("id", invoiceId)
      .maybeSingle();
    if (invErr) return json({ error: invErr.message }, 400);
    if (!invoice) return json({ error: "Rechnung nicht gefunden." }, 404);

    // 3) Fachliche Prüfungen — bewusst serverseitig, die UI ist nur Komfort.
    if (invoice.status !== "gestellt" || !invoice.invoice_number) {
      return json({ error: "Nur gestellte Rechnungen können gemahnt werden." }, 400);
    }
    if (!invoice.due_date) {
      return json({ error: "Die Rechnung hat kein Fälligkeitsdatum." }, 400);
    }
    const dueEnd = new Date(`${String(invoice.due_date).slice(0, 10)}T23:59:59`);
    if (dueEnd.getTime() >= Date.now()) {
      return json({ error: "Die Rechnung ist noch nicht überfällig." }, 400);
    }

    type Item = { quantity: number; rental_days: number; unit_price: number };
    type Payment = { amount: number };
    const net = ((invoice.items ?? []) as Item[]).reduce(
      (sum, it) => sum + it.quantity * it.rental_days * it.unit_price,
      0,
    );
    const gross = net * (1 + (invoice.tax_rate ?? 0) / 100);
    const paid = ((invoice.payments ?? []) as Payment[]).reduce((sum, p) => sum + p.amount, 0);
    const open = gross - paid;
    if (open <= 0.005) {
      return json({ error: "Die Rechnung ist bereits vollständig bezahlt." }, 400);
    }

    type Dunning = { level: number };
    const lastLevel = ((invoice.dunnings ?? []) as Dunning[]).reduce((max, d) => Math.max(max, d.level), 0);
    if (lastLevel >= 3) {
      return json({ error: "Die letzte Mahnstufe wurde bereits versendet." }, 400);
    }
    const level = (lastLevel + 1) as 1 | 2 | 3;
    const cfg = LEVELS[level];

    const toEmail = (invoice.customer?.email ?? "").trim();
    if (!toEmail) {
      return json({ error: "Der Kunde hat keine E-Mail-Adresse hinterlegt." }, 400);
    }

    // 4) Mail zusammenbauen (Firmendaten für Bankverbindung/Absender).
    const { data: company } = await caller
      .from("company_settings")
      .select("name, email, bank_line")
      .eq("id", true)
      .maybeSingle();
    const companyName = company?.name?.trim() || "EventTech";

    const customerName =
      invoice.customer?.company_name ||
      [invoice.customer?.first_name, invoice.customer?.last_name].filter(Boolean).join(" ") ||
      "Damen und Herren";

    const subject = `${cfg.subjectPrefix} zu Rechnung ${invoice.invoice_number}`;

    const rows: [string, string][] = [
      ["Rechnungsnummer", String(invoice.invoice_number)],
      ["Betreff", String(invoice.title ?? "")],
      ["Rechnungsdatum", invoice.invoice_date ? formatDateDe(String(invoice.invoice_date)) : "—"],
      ["Fällig seit", formatDateDe(String(invoice.due_date))],
      ["Rechnungsbetrag", formatEur(gross)],
      ...(paid > 0 ? ([["Bereits gezahlt", formatEur(paid)]] as [string, string][]) : []),
      ["Offener Betrag", formatEur(open)],
    ];

    const html =
      `<p>Sehr geehrte ${esc(customerName)},</p>` +
      `<p>${esc(cfg.intro)}</p>` +
      `<table cellpadding="6" style="border-collapse:collapse">` +
      rows
        .map(
          ([k, v]) =>
            `<tr><td style="border:1px solid #ddd"><b>${esc(k)}</b></td><td style="border:1px solid #ddd">${esc(v)}</td></tr>`,
        )
        .join("") +
      `</table>` +
      `<p>${esc(cfg.closing)}</p>` +
      (company?.bank_line ? `<p><b>Bankverbindung:</b><br>${esc(company.bank_line)}</p>` : "") +
      `<p>Mit freundlichen Grüßen<br>${esc(companyName)}</p>`;

    if (preview) {
      return json({ preview: true, level, level_label: cfg.label, to: toEmail, subject, html });
    }

    // 5) Versand über Resend (gleiches Secret wie public-lead).
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      return json(
        { error: "RESEND_API_KEY ist nicht als Supabase-Secret gesetzt — Versand nicht möglich." },
        500,
      );
    }
    const from =
      Deno.env.get("DUNNING_FROM") ||
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
    const { error: logErr } = await admin
      .from("invoice_dunnings")
      .insert({ invoice_id: invoiceId, level, to_email: toEmail, subject });
    if (logErr) {
      // Mail ist raus, Protokoll scheiterte (z.B. Race auf dieselbe Stufe) — melden,
      // damit der Nutzer den Verlauf prüft, statt still zu verschlucken.
      console.error("invoice_dunnings insert fehlgeschlagen:", logErr.message);
      return json(
        { error: "E-Mail wurde versendet, konnte aber nicht protokolliert werden. Bitte Verlauf prüfen." },
        500,
      );
    }

    return json({ ok: true, level, level_label: cfg.label, to: toEmail });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Serverfehler." }, 500);
  }
});
