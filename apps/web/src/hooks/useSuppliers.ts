import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Supplier } from "@/types/database";

const SUPPLIERS_KEY = ["suppliers"] as const;

export function useSuppliers() {
  return useQuery({
    queryKey: SUPPLIERS_KEY,
    queryFn: async (): Promise<Supplier[]> => {
      const { data, error } = await supabase.from("suppliers").select("*").order("name", { ascending: true });
      if (error) throw error;
      return data as Supplier[];
    },
  });
}

export function useSupplier(id: string | undefined) {
  return useQuery({
    queryKey: [...SUPPLIERS_KEY, id],
    enabled: !!id,
    queryFn: async (): Promise<Supplier | null> => {
      if (!id) return null;
      const { data, error } = await supabase.from("suppliers").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Supplier;
    },
  });
}

interface SupplierInput {
  name: string;
  trade?: string | null;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  street?: string | null;
  zip?: string | null;
  city?: string | null;
  website?: string | null;
  notes?: string | null;
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fields: SupplierInput) => {
      const { data, error } = await supabase.from("suppliers").insert(fields).select().single();
      if (error) throw error;
      return data as Supplier;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SUPPLIERS_KEY }),
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: SupplierInput & { id: string }) => {
      const { data, error } = await supabase.from("suppliers").update(fields).eq("id", id).select().single();
      if (error) throw error;
      return data as Supplier;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SUPPLIERS_KEY }),
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SUPPLIERS_KEY }),
  });
}
