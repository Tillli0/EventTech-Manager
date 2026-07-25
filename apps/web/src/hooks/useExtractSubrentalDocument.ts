import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface ExtractedSubrentalItem {
  description: string;
  quantity: number;
  unit_cost: number;
  category_name_guess?: string | null;
}

export interface ExtractedSubrentalDocument {
  supplier_name_guess?: string | null;
  start_date_guess?: string | null;
  end_date_guess?: string | null;
  items: ExtractedSubrentalItem[];
}

/**
 * Ohne Zeitgrenze hängt die Erkennung bei einer langsamen/hängenden Gemini-Antwort
 * (z.B. großes Handy-Foto statt PDF, schlechte Mobilverbindung) ohne Rückmeldung —
 * das führte dazu, dass Nutzer die Seite neu geladen haben, weil scheinbar nichts
 * passierte. `supabase-js` v2 unterstützt hier kein `signal`-Option auf
 * `functions.invoke`, daher ein reiner Client-seitiger Timeout per `Promise.race`:
 * bricht die Wartezeit nach `ms` mit einer klaren Fehlermeldung ab (die eigentliche
 * Server-Anfrage läuft im Hintergrund weiter, aber die UI hängt nicht mehr endlos).
 */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

const EXTRACTION_TIMEOUT_MS = 25_000;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // dataURL hat die Form "data:<mime>;base64,<data>" — nur den Data-Teil behalten.
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Datei konnte nicht gelesen werden."));
    reader.readAsDataURL(file);
  });
}

/**
 * Ruft die Edge Function `extract-subrental-document` auf: liest ein Verleiher-PDF
 * (Angebot/Rechnung) per KI aus und liefert einen Vorschlag für Partner/Zeitraum/
 * Positionen — nichts wird serverseitig gespeichert, reiner Formular-Vorschlag.
 */
export function useExtractSubrentalDocument() {
  return useMutation({
    mutationFn: async (file: File): Promise<ExtractedSubrentalDocument> => {
      const file_base64 = await fileToBase64(file);
      const { data, error } = await withTimeout(
        supabase.functions.invoke("extract-subrental-document", {
          body: { file_base64, mime_type: file.type || "application/pdf" },
        }),
        EXTRACTION_TIMEOUT_MS,
        "Die Erkennung hat zu lange gedauert und wurde abgebrochen. Bitte die Positionen manuell eingeben (bei einem Handy-Foto hilft oft ein kleineres Bild statt eines PDFs).",
      );
      if (error) {
        let message = error.message;
        const ctx = (error as { context?: Response }).context;
        if (ctx && typeof ctx.json === "function") {
          try {
            const detail = (await ctx.json()) as { error?: string };
            if (detail?.error) message = detail.error;
          } catch {
            // Antwort war kein JSON — generische Meldung behalten.
          }
        }
        throw new Error(message);
      }
      const body = data as { error?: string; extracted?: ExtractedSubrentalDocument };
      if (body?.error) throw new Error(body.error);
      if (!body?.extracted) throw new Error("Die Erkennung hat keine Daten geliefert.");
      return body.extracted;
    },
  });
}
