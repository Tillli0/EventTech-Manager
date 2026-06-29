import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { COMPANY_INFO, type CompanyInfo } from "@/lib/companyInfo";

/** DB-Zeile der Firmendaten (genau eine Zeile, id = true). */
export interface CompanySettings {
  name: string;
  address_lines: string[];
  phone: string | null;
  email: string | null;
  website: string | null;
  tax_id: string | null;
  bank_line: string | null;
  payment_terms: string | null;
  logo_path: string | null;
  /** Empfänger für Benachrichtigungen bei neuen Website-Anfragen (optional). */
  lead_notify_email: string | null;
}

const KEY = ["company-settings"] as const;

/** Öffentliche URL für ein im company-assets-Bucket gespeichertes Logo. */
export function companyLogoUrl(path: string): string {
  return supabase.storage.from("company-assets").getPublicUrl(path).data.publicUrl;
}

/** DB-Zeile in die PDF-Struktur (CompanyInfo) übersetzen; leere Felder fallen auf die Konstante zurück. */
export function toCompanyInfo(s: CompanySettings | null | undefined): CompanyInfo {
  if (!s) return COMPANY_INFO;
  return {
    name: s.name || COMPANY_INFO.name,
    addressLines: s.address_lines?.length ? s.address_lines : COMPANY_INFO.addressLines,
    phone: s.phone ?? undefined,
    email: s.email ?? undefined,
    website: s.website ?? undefined,
    taxId: s.tax_id ?? undefined,
    bankLine: s.bank_line ?? undefined,
    paymentTerms: s.payment_terms ?? undefined,
    logoUrl: s.logo_path ? companyLogoUrl(s.logo_path) : undefined,
  };
}

async function fetchRow(): Promise<CompanySettings | null> {
  const { data, error } = await supabase.from("company_settings").select("*").eq("id", true).maybeSingle();
  if (error) throw error;
  return (data as CompanySettings) ?? null;
}

export function useCompanySettings() {
  return useQuery({ queryKey: KEY, queryFn: fetchRow });
}

/** Für die PDF-Erzeugung: Firmendaten laden und als CompanyInfo liefern (Fallback = Konstante). */
export async function fetchCompanySettings(): Promise<CompanyInfo> {
  try {
    return toCompanyInfo(await fetchRow());
  } catch {
    return COMPANY_INFO;
  }
}

export function useUpdateCompanySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<CompanySettings>) => {
      const { error } = await supabase
        .from("company_settings")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", true);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

/** Lädt ein Firmenlogo hoch und speichert dessen Pfad in den Firmendaten. */
export function useUploadCompanyLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `logo-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("company-assets")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { error } = await supabase
        .from("company_settings")
        .update({ logo_path: path, updated_at: new Date().toISOString() })
        .eq("id", true);
      if (error) throw error;
      return path;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

/** Entfernt das Firmenlogo wieder (Pfad zurücksetzen). */
export function useRemoveCompanyLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (currentPath: string | null) => {
      if (currentPath) await supabase.storage.from("company-assets").remove([currentPath]);
      const { error } = await supabase
        .from("company_settings")
        .update({ logo_path: null, updated_at: new Date().toISOString() })
        .eq("id", true);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
