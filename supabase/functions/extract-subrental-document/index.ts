// EventTech Manager — Anmiet-Vorgänge: Verleiher-PDF automatisch auslesen (E2b)
//
// Nimmt ein Verleiher-Angebot oder eine -Rechnung als PDF (base64) entgegen und lässt
// Google Gemini (kostenlose Stufe, natives PDF-Verständnis) Partner/Zeitraum/Positionen
// als strukturiertes JSON herauslesen. Das Ergebnis befüllt im Frontend nur den
// Anmiet-Dialog (Vorschlag) — nichts wird hier gespeichert, der Nutzer prüft/korrigiert
// und speichert wie gewohnt über die bestehenden Mutationen.
//
// Sicherheit:
// * verify_jwt bleibt AN (config.toml) — nur eingeloggte Nutzer.
// * Zusätzlich can_edit_area('anmietung') des Aufrufers geprüft (RLS-Wahrheit),
//   dieselbe Berechtigung, die zum Anlegen eines Anmiet-Vorgangs ohnehin nötig ist.
// * "Ruhig by default": ohne GEMINI_API_KEY-Secret klare Fehlermeldung, 500 — keine
//   App-Funktion hängt an dieser Extraktion, manuelle Eingabe geht immer weiter.
//
// Aufruf: POST { file_base64: string, mime_type: string }

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

// deno-lint-ignore no-explicit-any
type AnyClient = any;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    supplier_name_guess: { type: "string", nullable: true },
    start_date_guess: { type: "string", nullable: true, description: "ISO-Format YYYY-MM-DD, falls erkennbar" },
    end_date_guess: { type: "string", nullable: true, description: "ISO-Format YYYY-MM-DD, falls erkennbar" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          description: { type: "string" },
          quantity: { type: "number" },
          unit_cost: { type: "number", description: "Einkaufspreis je Stück NETTO für den gesamten Zeitraum, nicht pro Tag" },
        },
        required: ["description", "quantity", "unit_cost"],
      },
    },
  },
  required: ["items"],
};

const PROMPT = `Das ist ein Angebot oder eine Rechnung eines Eventtechnik-Verleihers an uns \
(wir mieten Technik für eine Veranstaltung an). Lies das Dokument aus und liefere:
- supplier_name_guess: den Firmennamen des Verleihers (Absender), falls erkennbar.
- start_date_guess / end_date_guess: den Miet-/Leistungszeitraum als YYYY-MM-DD, falls im Dokument genannt.
- items: jede Mietposition mit Bezeichnung, Menge und Einkaufspreis je Stück NETTO für den \
GESAMTEN Zeitraum (nicht pro Tag hochrechnen — steht der Preis pro Tag da, multipliziere \
selbst mit der Miettage-Anzahl, damit unit_cost den Gesamtpreis je Stück ergibt).
Keine MwSt. einrechnen, immer Netto-Beträge. Wenn ein Wert nicht sicher erkennbar ist, lasse \
das Feld weg statt zu raten.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Nur POST erlaubt." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Nicht authentifiziert." }, 401);

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
    const fileBase64 = body.file_base64 as string | undefined;
    const mimeType = (body.mime_type as string | undefined) ?? "application/pdf";
    if (!fileBase64) return json({ error: "file_base64 fehlt." }, 400);

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return json(
        { error: "PDF-Erkennung ist noch nicht eingerichtet (GEMINI_API_KEY fehlt als Secret). Bitte Positionen manuell eingeben." },
        500,
      );
    }
    const model = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: mimeType, data: fileBase64 } },
                { text: PROMPT },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      },
    );

    if (!geminiRes.ok) {
      const detail = await geminiRes.text();
      console.error("Gemini-Aufruf fehlgeschlagen:", geminiRes.status, detail);
      return json({ error: `Dokumenten-Erkennung fehlgeschlagen (Gemini ${geminiRes.status}).` }, 502);
    }

    const geminiJson = await geminiRes.json();
    const text = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return json({ error: "Die Erkennung hat keine Daten geliefert." }, 502);
    }

    let extracted: unknown;
    try {
      extracted = JSON.parse(text);
    } catch {
      return json({ error: "Die Erkennung hat kein gültiges Format geliefert." }, 502);
    }

    return json({ ok: true, extracted });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Serverfehler." }, 500);
  }
});
