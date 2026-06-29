import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Customer, WebsiteLead, WebsiteLeadStatus } from "@/types/database";

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

/**
 * Macht aus einem Website-Lead einen echten Kunden samt Anfrage-Karte in der
 * Pipeline und markiert den Lead als "bearbeitet". Damit landet die Web-Anfrage
 * direkt im normalen Kunden-/Anfragen-Workflow.
 */
export function useConvertLeadToCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (lead: WebsiteLead): Promise<Customer> => {
      const { first_name, last_name } = splitName(lead.name);
      const noteParts = [
        lead.event_type ? `Art: ${lead.event_type}` : null,
        lead.message ? `Nachricht: ${lead.message}` : null,
      ].filter(Boolean);

      const { data: customer, error: custErr } = await supabase
        .from("customers")
        .insert({
          company_name: lead.company,
          first_name,
          last_name,
          email: lead.email,
          phone: lead.phone,
          source: "kontaktformular",
          notes: noteParts.length ? noteParts.join("\n") : null,
        })
        .select()
        .single();
      if (custErr) throw custErr;

      const { error: inqErr } = await supabase.from("customer_inquiries").insert({
        customer_id: (customer as Customer).id,
        title: lead.event_type || "Website-Anfrage",
        event_date: lead.event_date,
        description: lead.message,
      });
      if (inqErr) throw inqErr;

      const { error: leadErr } = await supabase
        .from("website_leads")
        .update({ status: "bearbeitet" })
        .eq("id", lead.id);
      if (leadErr) throw leadErr;

      return customer as Customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEADS_KEY });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["inquiries"] });
    },
  });
}
