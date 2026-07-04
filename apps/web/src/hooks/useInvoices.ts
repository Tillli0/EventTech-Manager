import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Customer, Invoice, Offer } from "@/types/database";

const INVOICES_KEY = ["invoices"] as const;

const INVOICE_SELECT =
  "*, customer:customers(*), items:invoice_items(*), payments:invoice_payments(*), dunnings:invoice_dunnings(*)";

export function useInvoices() {
  return useQuery({
    queryKey: INVOICES_KEY,
    queryFn: async (): Promise<Invoice[]> => {
      const { data, error } = await supabase
        .from("invoices")
        .select(INVOICE_SELECT)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Invoice[];
    },
  });
}

export interface CreateInvoiceItemInput {
  device_id: string | null;
  description: string;
  quantity: number;
  rental_days: number;
  unit_price: number;
}

export interface CreateInvoiceInput {
  customer_id: string | null;
  job_id?: string | null;
  offer_id?: string | null;
  title: string;
  due_date?: string | null;
  service_date?: string | null;
  tax_rate?: number;
  notes?: string | null;
  items: CreateInvoiceItemInput[];
}

/** Rechnung als Entwurf anlegen (ohne Nummer — die entsteht erst beim Stellen). */
export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateInvoiceInput): Promise<Invoice> => {
      const { items, ...fields } = input;
      const { data, error } = await supabase.from("invoices").insert(fields).select().single();
      if (error) throw error;
      const invoice = data as Invoice;

      if (items.length > 0) {
        const { error: itemsError } = await supabase.from("invoice_items").insert(
          items.map((item, index) => ({
            invoice_id: invoice.id,
            device_id: item.device_id,
            description: item.description,
            quantity: item.quantity,
            rental_days: item.rental_days,
            unit_price: item.unit_price,
            sort_order: index,
          })),
        );
        if (itemsError) {
          await supabase.from("invoices").delete().eq("id", invoice.id);
          throw itemsError;
        }
      }
      return invoice;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVOICES_KEY }),
  });
}

export interface UpdateInvoiceInput extends CreateInvoiceInput {
  id: string;
}

/**
 * Kopfdaten aktualisieren und Positionen komplett ersetzen (wie beim Angebot).
 * Nummer/Status werden hier bewusst nicht angefasst — Stellen/Storno laufen
 * über eigene Mutationen.
 */
export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateInvoiceInput): Promise<Invoice> => {
      const { id, items, ...fields } = input;
      const { data, error } = await supabase.from("invoices").update(fields).eq("id", id).select().single();
      if (error) throw error;

      const { error: delError } = await supabase.from("invoice_items").delete().eq("invoice_id", id);
      if (delError) throw delError;
      if (items.length > 0) {
        const { error: insError } = await supabase.from("invoice_items").insert(
          items.map((item, index) => ({
            invoice_id: id,
            device_id: item.device_id,
            description: item.description,
            quantity: item.quantity,
            rental_days: item.rental_days,
            unit_price: item.unit_price,
            sort_order: index,
          })),
        );
        if (insError) throw insError;
      }
      return data as Invoice;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVOICES_KEY }),
  });
}

/** Adress-Snapshot des Kunden für das Stellen der Rechnung (bleibt danach stabil). */
function customerAddressSnapshot(customer: Customer | null | undefined): string | null {
  if (!customer) return null;
  const lines: string[] = [];
  const name = customer.company_name || [customer.first_name, customer.last_name].filter(Boolean).join(" ");
  if (name) lines.push(name);
  if (customer.company_name && (customer.first_name || customer.last_name)) {
    lines.push([customer.first_name, customer.last_name].filter(Boolean).join(" "));
  }
  if (customer.address_street) lines.push(customer.address_street);
  const cityLine = [customer.address_zip, customer.address_city].filter(Boolean).join(" ");
  if (cityLine) lines.push(cityLine);
  return lines.length > 0 ? lines.join("\n") : null;
}

/**
 * Rechnung stellen: friert die Kundenadresse als Snapshot ein und lässt die DB
 * die lückenlose Nummer vergeben (issue_invoice, advisory-lock-gesichert).
 */
export function useIssueInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invoice: Invoice): Promise<Invoice> => {
      if (!invoice.address_snapshot) {
        const snapshot = customerAddressSnapshot(invoice.customer);
        if (snapshot) {
          await supabase.from("invoices").update({ address_snapshot: snapshot }).eq("id", invoice.id);
        }
      }
      const { data, error } = await supabase.rpc("issue_invoice", { p_invoice_id: invoice.id });
      if (error) throw error;
      return data as Invoice;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVOICES_KEY }),
  });
}

/** Storno statt Löschung für gestellte Rechnungen (GoBD). */
export function useCancelInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").update({ status: "storniert" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVOICES_KEY }),
  });
}

/** Nur Entwürfe sind löschbar — gestellte Rechnungen blockt die DB (Trigger). */
export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVOICES_KEY }),
  });
}

export function useAddInvoicePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { invoice_id: string; amount: number; paid_at: string; method?: string | null; note?: string | null }) => {
      const { error } = await supabase.from("invoice_payments").insert(input);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVOICES_KEY }),
  });
}

export function useDeleteInvoicePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoice_payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVOICES_KEY }),
  });
}

// ============================================================
// Mahnwesen (Edge Function send-dunning)
// ============================================================

export interface DunningPreview {
  level: number;
  level_label: string;
  to: string;
  subject: string;
  html: string;
}

/**
 * Edge Function aufrufen und Fehlertexte der Funktion (JSON { error }) durchreichen —
 * supabase-js liefert bei non-2xx sonst nur eine generische Meldung.
 */
async function invokeSendDunning(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke("send-dunning", { body });
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

/** Vorschau der nächsten Mahnstufe laden (nichts wird versendet). */
export async function fetchDunningPreview(invoiceId: string): Promise<DunningPreview> {
  const data = await invokeSendDunning({ invoice_id: invoiceId, preview: true });
  return data as unknown as DunningPreview;
}

/** Nächste Mahnstufe wirklich versenden (Server prüft Rechte + Überfälligkeit erneut). */
export function useSendDunning() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => invokeSendDunning({ invoice_id: invoiceId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVOICES_KEY }),
  });
}

/** Positionen eines Angebots als Rechnungs-Eingabe übernehmen. */
export function offerToInvoiceInput(offer: Offer): CreateInvoiceInput {
  return {
    customer_id: offer.customer_id,
    job_id: offer.job_id ?? null,
    offer_id: offer.id,
    title: offer.title,
    service_date: offer.event_date ?? null,
    tax_rate: offer.tax_rate,
    notes: offer.notes ?? null,
    items: [...(offer.items ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((it) => ({
        device_id: it.device_id,
        description: it.description,
        quantity: it.quantity,
        rental_days: it.rental_days,
        unit_price: it.unit_price,
      })),
  };
}

/** Vollständige Rechnung inkl. Positionen/Zahlungen laden (für den PDF-Export). */
export async function fetchInvoiceWithItems(id: string): Promise<Invoice> {
  const { data, error } = await supabase.from("invoices").select(INVOICE_SELECT).eq("id", id).single();
  if (error) throw error;
  const invoice = data as Invoice;
  invoice.items = [...(invoice.items ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  return invoice;
}
