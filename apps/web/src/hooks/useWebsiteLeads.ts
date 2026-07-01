import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { startOfDay, endOfDay } from "date-fns";
import { supabase } from "@/lib/supabase";
import { randomJobColor } from "@/types/database";
import type { Customer, Job, WebsiteLead, WebsiteLeadStatus } from "@/types/database";

const LEADS_KEY = ["website-leads"] as const;

export function useWebsiteLeads() {
  return useQuery({
    queryKey: LEADS_KEY,
    queryFn: async (): Promise<WebsiteLead[]> => {
      const { data, error } = await supabase
        .from("website_leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as WebsiteLead[];
    },
  });
}

/** Anzahl noch nicht gesichteter ("neu") Leads — für das Badge am Tab. */
export function useNewWebsiteLeadCount(): number {
  const { data } = useWebsiteLeads();
  return data?.filter((l) => l.status === "neu").length ?? 0;
}

export function useUpdateWebsiteLeadStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: WebsiteLeadStatus }) => {
      const { error } = await supabase.from("website_leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEADS_KEY });
    },
  });
}

// "Max Mustermann" -> { first_name: "Max", last_name: "Mustermann" }
function splitName(name: string): { first_name: string | null; last_name: string | null } {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return { first_name: null, last_name: null };
  if (parts.length === 1) return { first_name: parts[0], last_name: null };
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}

// Lead-Inhalte (Art + Nachricht) als Mehrzeiler für das Notizfeld des Kunden.
function leadNotes(lead: WebsiteLead): string | null {
  const parts = [
    lead.event_type ? `Art: ${lead.event_type}` : null,
    lead.message ? `Nachricht: ${lead.message}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join("\n") : null;
}

// Legt aus den Lead-Daten einen Kunden an (source 'kontaktformular') und gibt ihn zurück.
async function insertCustomerFromLead(lead: WebsiteLead): Promise<Customer> {
  const { first_name, last_name } = splitName(lead.name);
  const { data, error } = await supabase
    .from("customers")
    .insert({
      company_name: lead.company,
      first_name,
      last_name,
      email: lead.email,
      phone: lead.phone,
      source: "kontaktformular",
      notes: leadNotes(lead),
    })
    .select()
    .single();
  if (error) throw error;
  return data as Customer;
}

function customerDisplayName(c: Customer): string {
  return c.company_name || [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || "Kunde";
}

/**
 * Sucht einen bestehenden Kunden mit gleicher E-Mail (case-insensitive) oder
 * Telefonnummer — für die Dubletten-Erkennung beim Akzeptieren eines Leads.
 */
export async function findCustomerByContact(
  email: string | null,
  phone: string | null,
): Promise<Customer | null> {
  const filters: string[] = [];
  if (email?.trim()) filters.push(`email.ilike.${email.trim()}`);
  if (phone?.trim()) filters.push(`phone.eq.${phone.trim()}`);
  if (filters.length === 0) return null;
  const { data, error } = await supabase.from("customers").select("*").or(filters.join(",")).limit(1);
  if (error) throw error;
  return (data?.[0] as Customer) ?? null;
}

interface AcceptLeadArgs {
  lead: WebsiteLead;
  /** Wenn gesetzt, wird dieser bestehende Kunde verwendet statt einen neuen anzulegen (Dubletten-Erkennung). */
  existingCustomer?: Customer | null;
}

/**
 * Akzeptiert eine Website-Anfrage: legt (falls nötig) einen Kunden an, erstellt
 * automatisch einen Job aus den Anfrage-Daten (Titel, Zeitraum, Nachricht als
 * Notiz) samt Kalendereintrag und markiert den Lead als "akzeptiert".
 */
export function useAcceptLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ lead, existingCustomer }: AcceptLeadArgs): Promise<{ customer: Customer; job: Job }> => {
      const customer = existingCustomer ?? (await insertCustomerFromLead(lead));

      // Zeitraum: Event-Datum als eintägiger Job; ohne Datum der heutige Tag.
      const base = lead.event_date ? new Date(`${lead.event_date}T12:00:00`) : new Date();
      const start = startOfDay(base).toISOString();
      const end = endOfDay(base).toISOString();

      const { data: jobData, error: jobError } = await supabase
        .from("jobs")
        .insert({
          title: lead.event_type?.trim() || `Anfrage ${lead.name}`,
          customer_id: customer.id,
          status: "anfrage",
          start_date: start,
          end_date: end,
          notes: lead.message?.trim() || null,
          color: randomJobColor(),
        })
        .select()
        .single();
      if (jobError) throw jobError;
      const job = jobData as Job;

      const { error: calendarError } = await supabase.from("calendar_entries").insert({
        job_id: job.id,
        title: customerDisplayName(customer),
        start_at: job.start_date,
        end_at: job.end_date,
        all_day: false,
        source: "intern",
      });
      if (calendarError) throw calendarError;

      const { error: statusError } = await supabase
        .from("website_leads")
        .update({ status: "akzeptiert" })
        .eq("id", lead.id);
      if (statusError) throw statusError;

      return { customer, job };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEADS_KEY });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });
}
