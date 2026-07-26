import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { SUBRENTAL_COUNTING_STATUSES } from "@/lib/availability";
import type { Subrental, SubrentalItem, SubrentalLogistics, SubrentalStatus } from "@/types/database";

const SUBRENTALS_KEY = ["subrentals"] as const;
const SELECT =
  "*, supplier:suppliers(*), job:jobs(id, title, start_date, end_date), items:subrental_items(*, category:categories(*)), order_emails:subrental_order_emails(*)";
const ORDER_PREFIX = "AM-";
const ORDER_PAD = 4;

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}

export function useSubrentals() {
  return useQuery({
    queryKey: SUBRENTALS_KEY,
    queryFn: async (): Promise<Subrental[]> => {
      const { data, error } = await supabase.from("subrentals").select(SELECT).order("start_date", { ascending: false });
      if (error) throw error;
      return data as Subrental[];
    },
  });
}

/** Anmiet-Vorgänge, die zu einem bestimmten Job gehören. */
export function useSubrentalsForJob(jobId: string | undefined) {
  return useQuery({
    queryKey: [...SUBRENTALS_KEY, "by-job", jobId],
    enabled: !!jobId,
    queryFn: async (): Promise<Subrental[]> => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from("subrentals")
        .select(SELECT)
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Subrental[];
    },
  });
}

export interface SubrentalItemInput {
  device_id: string | null;
  category_id: string | null;
  description: string;
  quantity: number;
  unit_cost: number;
}

export interface CreateSubrentalInput {
  job_id: string;
  supplier_id: string;
  start_date: string;
  end_date: string;
  logistics: SubrentalLogistics;
  notes: string | null;
  items: SubrentalItemInput[];
}

export function useCreateSubrental() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSubrentalInput): Promise<Subrental> => {
      const { items, ...fields } = input;
      const { data, error } = await supabase.from("subrentals").insert(fields).select().single();
      if (error) throw error;
      const subrental = data as Subrental;

      if (items.length > 0) {
        const { error: itemsError } = await supabase.from("subrental_items").insert(
          items.map((item, index) => ({
            subrental_id: subrental.id,
            device_id: item.device_id,
            category_id: item.category_id,
            description: item.description,
            quantity: item.quantity,
            unit_cost: item.unit_cost,
            sort_order: index,
          })),
        );
        if (itemsError) {
          await supabase.from("subrentals").delete().eq("id", subrental.id);
          throw itemsError;
        }
      }

      return subrental;
    },
    onSuccess: (subrental) => {
      queryClient.invalidateQueries({ queryKey: SUBRENTALS_KEY });
      queryClient.invalidateQueries({ queryKey: [...SUBRENTALS_KEY, "by-job", subrental.job_id] });
    },
  });
}

export interface UpdateSubrentalInput extends Omit<CreateSubrentalInput, "job_id"> {
  id: string;
  job_id: string;
  status: SubrentalStatus;
}

/** Aktualisiert Kopfdaten + Status und ersetzt die Positionen komplett (wie bei Angeboten). */
export function useUpdateSubrental() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateSubrentalInput): Promise<Subrental> => {
      const { id, items, ...fields } = input;
      const { data, error } = await supabase.from("subrentals").update(fields).eq("id", id).select().single();
      if (error) throw error;
      const subrental = data as Subrental;

      const { error: delError } = await supabase.from("subrental_items").delete().eq("subrental_id", id);
      if (delError) throw delError;
      if (items.length > 0) {
        const { error: insError } = await supabase.from("subrental_items").insert(
          items.map((item, index) => ({
            subrental_id: id,
            device_id: item.device_id,
            category_id: item.category_id,
            description: item.description,
            quantity: item.quantity,
            unit_cost: item.unit_cost,
            sort_order: index,
          })),
        );
        if (insError) throw insError;
      }

      return subrental;
    },
    onSuccess: (subrental) => {
      queryClient.invalidateQueries({ queryKey: SUBRENTALS_KEY });
      queryClient.invalidateQueries({ queryKey: [...SUBRENTALS_KEY, "by-job", subrental.job_id] });
    },
  });
}

export function useDeleteSubrental() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; jobId: string }) => {
      const { error } = await supabase.from("subrentals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: SUBRENTALS_KEY });
      queryClient.invalidateQueries({ queryKey: [...SUBRENTALS_KEY, "by-job", variables.jobId] });
    },
  });
}

/**
 * Liefert die nächste freie Bestellnummer im Format AM-{Jahr}-0001 (Muster
 * `nextFreeOfferNumber`, keine GoBD-Pflicht → kein Advisory-Lock, die partielle
 * Unique-Bedingung auf `order_number` sichert gegen parallele Vergabe ab).
 */
async function nextFreeSubrentalOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${ORDER_PREFIX}${year}-`;

  const { data, error } = await supabase
    .from("subrentals")
    .select("order_number")
    .like("order_number", `${prefix}%`)
    .order("order_number", { ascending: false })
    .limit(1);
  if (error) throw error;

  const last = data?.[0]?.order_number as string | null | undefined;
  let n = (last ? parseInt(last.slice(prefix.length), 10) || 0 : 0) + 1;

  for (let i = 0; i < 1000; i++) {
    const candidate = `${prefix}${String(n).padStart(ORDER_PAD, "0")}`;
    const { data: existing, error: checkError } = await supabase
      .from("subrentals")
      .select("id")
      .eq("order_number", candidate)
      .maybeSingle();
    if (checkError) throw checkError;
    if (!existing) return candidate;
    n++;
  }
  throw new Error("Keine freie Bestellnummer gefunden.");
}

/**
 * Vergibt beim ersten Bestell-PDF eine AM-Nummer (idempotent — hat der Vorgang
 * schon eine, wird nichts geändert). Bei Nummernkollision (parallele Erzeugung)
 * wird erneut versucht, analog `useCreateOffer`.
 */
export function useAssignSubrentalOrderNumber() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (subrental: Subrental): Promise<Subrental> => {
      if (subrental.order_number) return subrental;

      let updated: Subrental | null = null;
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 10; attempt++) {
        const order_number = await nextFreeSubrentalOrderNumber();
        const { data, error } = await supabase
          .from("subrentals")
          .update({ order_number })
          .eq("id", subrental.id)
          .select(SELECT)
          .single();
        if (!error) {
          updated = data as Subrental;
          break;
        }
        lastError = error;
        if (isUniqueViolation(error)) continue;
        throw error;
      }
      if (!updated) {
        throw lastError instanceof Error
          ? lastError
          : new Error("Bestellnummer konnte nicht vergeben werden.");
      }
      return updated;
    },
    onSuccess: (subrental) => {
      queryClient.invalidateQueries({ queryKey: SUBRENTALS_KEY });
      queryClient.invalidateQueries({ queryKey: [...SUBRENTALS_KEY, "by-job", subrental.job_id] });
    },
  });
}

/**
 * Anmiet-Zugänge je Gerät im Zeitraum (E3) — global, OHNE `excludeJobId`: anders als
 * bei Eigenbestand (der den eigenen Job ausschließt) soll eine für genau diesen Job
 * angelegte Anmietung auch für diesen Job als Zugang zählen. Nur Positionen MIT
 * `device_id` wirken (Freitext-Positionen decken keinen Katalog-Engpass), nur
 * `SUBRENTAL_COUNTING_STATUSES` (bestaetigt/uebernommen/zurueckgegeben) zählen.
 */
export function useSubrentalAdditionsMap(startDate: string | undefined, endDate: string | undefined) {
  return useQuery({
    queryKey: ["subrental-additions-map", startDate, endDate],
    enabled: !!startDate && !!endDate,
    queryFn: async (): Promise<Map<string, number>> => {
      // Reine Datums-Vergleiche (subrentals.start_date/end_date sind `date`, kein
      // Zeitanteil) — Tagesanteil abschneiden, sonst zählt ein gemeinsamer Randtag
      // je nach Uhrzeit-Koerzierung inkonsistent.
      const start = startDate!.slice(0, 10);
      const end = endDate!.slice(0, 10);

      const { data, error } = await supabase
        .from("subrental_items")
        .select("device_id, quantity, subrentals!inner(status, start_date, end_date)")
        .not("device_id", "is", null)
        .in("subrentals.status", [...SUBRENTAL_COUNTING_STATUSES])
        .lte("subrentals.start_date", end)
        .gte("subrentals.end_date", start);
      if (error) throw error;

      const map = new Map<string, number>();
      for (const row of data as unknown as { device_id: string | null; quantity: number }[]) {
        if (!row.device_id) continue;
        map.set(row.device_id, (map.get(row.device_id) ?? 0) + row.quantity);
      }
      return map;
    },
  });
}

/**
 * Aktuell (heute) zusätzlich verfügbare Menge je Gerät aus laufenden Anmiet-
 * Vorgängen — fürs Inventar-Badge „+X angemietet" (Muster `useDevicesOutNowMap`,
 * gleiche Zähl-Regeln wie `useSubrentalAdditionsMap`: nur Positionen MIT
 * `device_id`, nur `SUBRENTAL_COUNTING_STATUSES`, Zeitraum umfasst heute).
 */
export function useCurrentSubrentalAdditionsMap() {
  return useQuery({
    queryKey: ["subrental-additions-map", "today"],
    queryFn: async (): Promise<Map<string, number>> => {
      const today = new Date().toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from("subrental_items")
        .select("device_id, quantity, subrentals!inner(status, start_date, end_date)")
        .not("device_id", "is", null)
        .in("subrentals.status", [...SUBRENTAL_COUNTING_STATUSES])
        .lte("subrentals.start_date", today)
        .gte("subrentals.end_date", today);
      if (error) throw error;

      const map = new Map<string, number>();
      for (const row of data as unknown as { device_id: string | null; quantity: number }[]) {
        if (!row.device_id) continue;
        map.set(row.device_id, (map.get(row.device_id) ?? 0) + row.quantity);
      }
      return map;
    },
  });
}

// ============================================================
// Bestell-Mail an Verleiher (E5, Edge Function send-subrental-order)
// ============================================================

export interface SubrentalOrderPreview {
  preview: true;
  to: string;
  subject: string;
  html: string;
}

/**
 * Edge Function aufrufen und Fehlertexte der Funktion (JSON { error }) durchreichen —
 * supabase-js liefert bei non-2xx sonst nur eine generische Meldung (Muster useInvoices.ts).
 */
async function invokeSendSubrentalOrder(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke("send-subrental-order", { body });
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
  if (data && (data as { error?: string }).error) {
    throw new Error((data as { error: string }).error);
  }
  return (data ?? {}) as Record<string, unknown>;
}

/** Vorschau der Bestell-Mail laden (nichts wird versendet). */
export async function fetchSubrentalOrderPreview(subrentalId: string): Promise<SubrentalOrderPreview> {
  const data = await invokeSendSubrentalOrder({ subrental_id: subrentalId, preview: true });
  return data as unknown as SubrentalOrderPreview;
}

/** Bestell-Mail wirklich versenden (Server prüft Rechte + Voraussetzungen erneut). */
export function useSendSubrentalOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subrentalId: string) => invokeSendSubrentalOrder({ subrental_id: subrentalId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SUBRENTALS_KEY }),
  });
}

export type { SubrentalItem };
