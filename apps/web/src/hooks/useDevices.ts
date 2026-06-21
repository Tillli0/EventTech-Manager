import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Device, DeviceStatus } from "@/types/database";

const DEVICES_KEY = ["devices"] as const;

export function useDevices() {
  return useQuery({
    queryKey: DEVICES_KEY,
    queryFn: async (): Promise<Device[]> => {
      const { data, error } = await supabase
        .from("devices")
        .select("*, category:categories(*), barcodes(*)")
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Device[];
    },
  });
}

export function useDevice(id: string | undefined) {
  return useQuery({
    queryKey: [...DEVICES_KEY, id],
    enabled: !!id,
    queryFn: async (): Promise<Device | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("devices")
        .select("*, category:categories(*), barcodes(*)")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Device;
    },
  });
}

export function useDeviceByBarcode(code: string | undefined) {
  return useQuery({
    queryKey: [...DEVICES_KEY, "barcode", code],
    enabled: !!code,
    queryFn: async (): Promise<Device | null> => {
      if (!code) return null;
      const { data: barcode, error: barcodeError } = await supabase
        .from("barcodes")
        .select("device_id")
        .eq("code", code)
        .maybeSingle();

      if (barcodeError) throw barcodeError;
      if (!barcode) return null;

      const { data, error } = await supabase
        .from("devices")
        .select("*, category:categories(*), barcodes(*)")
        .eq("id", barcode.device_id)
        .single();

      if (error) throw error;
      return data as Device;
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

interface CreateDeviceInput {
  name: string;
  category_id: string | null;
  manufacturer?: string | null;
  model?: string | null;
  serial_number?: string | null;
  location?: string | null;
  purchase_date?: string | null;
  purchase_price?: number | null;
  replacement_value?: number | null;
  weight_kg?: number | null;
  power_watts?: number | null;
  notes?: string | null;
  barcode: string;
}

export function useCreateDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateDeviceInput) => {
      const { barcode, ...deviceFields } = input;

      const { data: device, error: deviceError } = await supabase
        .from("devices")
        .insert(deviceFields)
        .select()
        .single();

      if (deviceError) throw deviceError;

      const { error: barcodeError } = await supabase
        .from("barcodes")
        .insert({ device_id: device.id, code: barcode });

      if (barcodeError) throw barcodeError;

      return device as Device;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEVICES_KEY });
    },
  });
}

export function useUpdateDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: Partial<Device> & { id: string }) => {
      const { data, error } = await supabase
        .from("devices")
        .update(fields)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Device;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEVICES_KEY });
    },
  });
}

export function useUpdateDeviceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DeviceStatus }) => {
      const { data, error } = await supabase
        .from("devices")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Device;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEVICES_KEY });
    },
  });
}

export function useDeleteDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("devices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEVICES_KEY });
    },
  });
}

/** Nächste freie interne Barcode-Nummer im Format ETM-00001 vorschlagen */
export function useNextBarcodeSuggestion() {
  return useQuery({
    queryKey: ["barcodes", "next-suggestion"],
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase
        .from("barcodes")
        .select("code")
        .like("code", "ETM-%")
        .order("code", { ascending: false })
        .limit(1);

      if (error) throw error;

      const lastCode = data?.[0]?.code;
      const lastNumber = lastCode ? parseInt(lastCode.replace("ETM-", ""), 10) : 0;
      const nextNumber = lastNumber + 1;
      return `ETM-${String(nextNumber).padStart(5, "0")}`;
    },
  });
}
