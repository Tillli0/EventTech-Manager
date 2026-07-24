import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface ExtractedSubrentalItem {
  description: string;
  quantity: number;
  unit_cost: number;
}

export interface ExtractedSubrentalDocument {
  supplier_name_guess?: string | null;
  start_date_guess?: string | null;
  end_date_guess?: string | null;
  items: ExtractedSubrentalItem[];
}

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
      const { data, error } = await supabase.functions.invoke("extract-subrental-document", {
        body: { file_base64, mime_type: file.type || "application/pdf" },
      });
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
