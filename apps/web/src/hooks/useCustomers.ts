import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Customer, CustomerInquiry, CustomerNote, InquiryPipelineStatus } from "@/types/database";

const CUSTOMERS_KEY = ["customers"] as const;
const INQUIRIES_KEY = ["inquiries"] as const;

export function useCustomers() {
  return useQuery({
    queryKey: CUSTOMERS_KEY,
    queryFn: async (): Promise<Customer[]> => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Customer[];
    },
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: [...CUSTOMERS_KEY, id],
    enabled: !!id,
    queryFn: async (): Promise<Customer | null> => {
      if (!id) return null;
      const { data, error } = await supabase.from("customers").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Customer;
    },
  });
}

export function useCustomerNotes(customerId: string | undefined) {
  return useQuery({
    queryKey: ["customer-notes", customerId],
    enabled: !!customerId,
    queryFn: async (): Promise<CustomerNote[]> => {
      if (!customerId) return [];
      const { data, error } = await supabase
        .from("customer_notes")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CustomerNote[];
    },
  });
}

/**
 * Liefert die Anzahl nicht-stornierter Jobs je Kunde als Map (customerId -> Anzahl).
 * Basis für die automatische Stammkunden-Erkennung (siehe isStammkunde / View
 * customer_job_counts). Eine Query für alle Kunden statt pro Kunde einzeln.
 */
export function useCustomerJobCounts() {
  return useQuery({
    queryKey: ["customer-job-counts"],
    queryFn: async (): Promise<Map<string, number>> => {
      const { data, error } = await supabase.from("customer_job_counts").select("customer_id, job_count");
      if (error) throw error;
      const map = new Map<string, number>();
      for (const row of (data ?? []) as { customer_id: string; job_count: number }[]) {
        map.set(row.customer_id, row.job_count);
      }
      return map;
    },
  });
}

export function useCustomerJobs(customerId: string | undefined) {
  return useQuery({
    queryKey: ["customer-jobs", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      if (!customerId) return [];
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("customer_id", customerId)
        .is("deleted_at", null)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

interface CreateCustomerInput {
  company_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address_street?: string | null;
  address_zip?: string | null;
  address_city?: string | null;
  source: Customer["source"];
  notes?: string | null;
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCustomerInput) => {
      const { data, error } = await supabase.from("customers").insert(input).select().single();
      if (error) throw error;
      return data as Customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: Partial<Customer> & { id: string }) => {
      const { data, error } = await supabase
        .from("customers")
        .update(fields)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Customer;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY });
      queryClient.invalidateQueries({ queryKey: [...CUSTOMERS_KEY, data.id] });
    },
  });
}

export function useAddCustomerNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      customerId,
      content,
      inquiryId,
    }: {
      customerId: string;
      content: string;
      inquiryId?: string;
    }) => {
      const { data, error } = await supabase
        .from("customer_notes")
        .insert({ customer_id: customerId, content, inquiry_id: inquiryId ?? null })
        .select()
        .single();
      if (error) throw error;
      return data as CustomerNote;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customer-notes", variables.customerId] });
    },
  });
}

// ============================================================
// Anfragen-Pipeline (Kanban)
// ============================================================

export function useInquiries() {
  return useQuery({
    queryKey: INQUIRIES_KEY,
    queryFn: async (): Promise<CustomerInquiry[]> => {
      const { data, error } = await supabase
        .from("customer_inquiries")
        .select("*, customer:customers(*)")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as CustomerInquiry[];
    },
  });
}

interface CreateInquiryInput {
  customer_id: string;
  title: string;
  event_date?: string | null;
  budget_estimate?: number | null;
  description?: string | null;
}

export function useCreateInquiry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateInquiryInput) => {
      const { data, error } = await supabase
        .from("customer_inquiries")
        .insert(input)
        .select("*, customer:customers(*)")
        .single();
      if (error) throw error;
      return data as CustomerInquiry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INQUIRIES_KEY });
    },
  });
}

export function useUpdateInquiryStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pipeline_status }: { id: string; pipeline_status: InquiryPipelineStatus }) => {
      const { data, error } = await supabase
        .from("customer_inquiries")
        .update({ pipeline_status })
        .eq("id", id)
        .select("*, customer:customers(*)")
        .single();
      if (error) throw error;
      return data as CustomerInquiry;
    },
    onMutate: async ({ id, pipeline_status }) => {
      // Optimistisches Update fürs Drag & Drop im Kanban
      await queryClient.cancelQueries({ queryKey: INQUIRIES_KEY });
      const previous = queryClient.getQueryData<CustomerInquiry[]>(INQUIRIES_KEY);
      queryClient.setQueryData<CustomerInquiry[]>(INQUIRIES_KEY, (old) =>
        old?.map((inq) => (inq.id === id ? { ...inq, pipeline_status } : inq)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(INQUIRIES_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: INQUIRIES_KEY });
    },
  });
}
