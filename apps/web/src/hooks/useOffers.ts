import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Offer, OfferItem, OfferStatus } from "@/types/database";

const OFFERS_KEY = ["offers"] as const;
const OFFER_PREFIX = "AN-";
const OFFER_PAD = 4;

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}

/**
 * Liefert die nächste freie Angebotsnummer im Format AN-{Jahr}-0001. Startet bei
 * (höchste vergebene Nummer des laufenden Jahres + 1) und zählt hoch, bis ein
 * garantiert freier Code gefunden ist. Die DB-Unique-Bedingung sichert zusätzlich
 * gegen parallele Anlage ab (dann wird im Insert erneut versucht).
 */
async function nextFreeOfferNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${OFFER_PREFIX}${year}-`;

  const { data, error } = await supabase
    .from("offers")
    .select("offer_number")
    .like("offer_number", `${prefix}%`)
    .order("offer_number", { ascending: false })
    .limit(1);
  if (error) throw error;

  const last = data?.[0]?.offer_number;
  let n = (last ? parseInt(last.slice(prefix.length), 10) || 0 : 0) + 1;

  for (let i = 0; i < 1000; i++) {
    const candidate = `${prefix}${String(n).padStart(OFFER_PAD, "0")}`;
    const { data: existing, error: checkError } = await supabase
      .from("offers")
      .select("id")
      .eq("offer_number", candidate)
      .maybeSingle();
    if (checkError) throw checkError;
    if (!existing) return candidate;
    n++;
  }
  throw new Error("Keine freie Angebotsnummer gefunden.");
}

export function useOffers() {
  return useQuery({
    queryKey: OFFERS_KEY,
    queryFn: async (): Promise<Offer[]> => {
      const { data, error } = await supabase
        .from("offers")
        .select("*, customer:customers(*), items:offer_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Offer[];
    },
  });
}

export function useOffer(id: string | undefined) {
  return useQuery({
    queryKey: [...OFFERS_KEY, id],
    enabled: !!id,
    queryFn: async (): Promise<Offer | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("offers")
        .select("*, customer:customers(*), items:offer_items(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Offer;
    },
  });
}

export function useOffersForCustomer(customerId: string | undefined) {
  return useQuery({
    queryKey: [...OFFERS_KEY, "by-customer", customerId],
    enabled: !!customerId,
    queryFn: async (): Promise<Offer[]> => {
      if (!customerId) return [];
      const { data, error } = await supabase
        .from("offers")
        .select("*, items:offer_items(*)")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Offer[];
    },
  });
}

/** Angebote, die mit einem bestimmten Job verknüpft sind. */
export function useOffersForJob(jobId: string | undefined) {
  return useQuery({
    queryKey: [...OFFERS_KEY, "by-job", jobId],
    enabled: !!jobId,
    queryFn: async (): Promise<Offer[]> => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from("offers")
        .select("*, items:offer_items(*)")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Offer[];
    },
  });
}

export interface CreateOfferItemInput {
  device_id: string | null;
  description: string;
  quantity: number;
  rental_days: number;
  unit_price: number;
}

export interface CreateOfferInput {
  customer_id: string | null;
  inquiry_id?: string | null;
  job_id?: string | null;
  title: string;
  event_date?: string | null;
  valid_until?: string | null;
  tax_rate?: number;
  notes?: string | null;
  items: CreateOfferItemInput[];
}

export function useCreateOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOfferInput): Promise<Offer> => {
      const { items, inquiry_id, ...offerFields } = input;

      // Angebot anlegen; bei Nummernkollision (parallele Anlage) erneut versuchen.
      let offer: Offer | null = null;
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 10; attempt++) {
        const offer_number = await nextFreeOfferNumber();
        const { data, error } = await supabase
          .from("offers")
          .insert({ ...offerFields, inquiry_id: inquiry_id ?? null, offer_number })
          .select()
          .single();
        if (!error) {
          offer = data as Offer;
          break;
        }
        lastError = error;
        if (isUniqueViolation(error)) continue;
        throw error;
      }
      if (!offer) {
        throw lastError instanceof Error
          ? lastError
          : new Error("Angebot konnte nicht angelegt werden (Nummernvergabe fehlgeschlagen).");
      }

      // Positionen anlegen.
      if (items.length > 0) {
        const { error: itemsError } = await supabase.from("offer_items").insert(
          items.map((item, index) => ({
            offer_id: offer!.id,
            device_id: item.device_id,
            description: item.description,
            quantity: item.quantity,
            rental_days: item.rental_days,
            unit_price: item.unit_price,
            sort_order: index,
          })),
        );
        if (itemsError) {
          // Kein Angebot ohne Positionen zurücklassen.
          await supabase.from("offers").delete().eq("id", offer.id);
          throw itemsError;
        }
      }

      // Verknüpfte Anfrage automatisch auf "Angebot gesendet" setzen.
      if (inquiry_id) {
        await supabase
          .from("customer_inquiries")
          .update({ pipeline_status: "angebot_gesendet" })
          .eq("id", inquiry_id);
      }

      return offer;
    },
    onSuccess: (offer) => {
      queryClient.invalidateQueries({ queryKey: OFFERS_KEY });
      queryClient.invalidateQueries({ queryKey: ["inquiries"] });
      if (offer.customer_id) {
        queryClient.invalidateQueries({ queryKey: [...OFFERS_KEY, "by-customer", offer.customer_id] });
      }
      if (offer.job_id) {
        queryClient.invalidateQueries({ queryKey: [...OFFERS_KEY, "by-job", offer.job_id] });
      }
    },
  });
}

export function useUpdateOfferStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OfferStatus }) => {
      const { data, error } = await supabase
        .from("offers")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Offer;
    },
    onSuccess: (offer) => {
      queryClient.invalidateQueries({ queryKey: OFFERS_KEY });
      queryClient.invalidateQueries({ queryKey: [...OFFERS_KEY, offer.id] });
      if (offer.customer_id) {
        queryClient.invalidateQueries({ queryKey: [...OFFERS_KEY, "by-customer", offer.customer_id] });
      }
    },
  });
}

export function useDeleteOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; customerId?: string | null }) => {
      const { error } = await supabase.from("offers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: OFFERS_KEY });
      if (variables.customerId) {
        queryClient.invalidateQueries({ queryKey: [...OFFERS_KEY, "by-customer", variables.customerId] });
      }
    },
  });
}

/** Vollständiges Angebot inkl. Positionen laden (für den PDF-Export aus Listen heraus). */
export async function fetchOfferWithItems(id: string): Promise<Offer> {
  const { data, error } = await supabase
    .from("offers")
    .select("*, customer:customers(*), items:offer_items(*)")
    .eq("id", id)
    .single();
  if (error) throw error;
  const offer = data as Offer;
  offer.items = [...(offer.items ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  return offer;
}

export type { OfferItem };
