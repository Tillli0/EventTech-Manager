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

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color?: string | null }) => {
      const { data: existing } = await supabase
        .from("categories")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1);
      const nextSort = (existing?.[0]?.sort_order ?? 0) + 1;
      const { data, error } = await supabase
        .from("categories")
        .insert({ name, color: color ?? null, sort_order: nextSort, parent_id: null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name?: string; color?: string | null }) => {
      const fields: Record<string, unknown> = {};
      if (name !== undefined) fields.name = name;
      if (color !== undefined) fields.color = color;
      const { data, error } = await supabase
        .from("categories")
        .update(fields)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: DEVICES_KEY });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
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
  /** Gesamtbestand. Default 1 (Einzelstück). >1 = Mengen-Gerät, z.B. 20 Kabel. */
  stock_quantity?: number;
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

export function useUploadDevicePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ deviceId, file }: { deviceId: string; file: File }) => {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${deviceId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("device-photos")
        .upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;

      // Prüfen ob bereits ein Cover existiert
      const { data: existing } = await supabase
        .from("device_photos")
        .select("id")
        .eq("device_id", deviceId)
        .eq("is_cover", true)
        .limit(1);

      const isCover = !existing || existing.length === 0;

      const { data, error } = await supabase
        .from("device_photos")
        .insert({ device_id: deviceId, storage_path: path, is_cover: isCover, sort_order: 0 })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { deviceId }) => {
      queryClient.invalidateQueries({ queryKey: [...DEVICES_KEY, deviceId] });
      queryClient.invalidateQueries({ queryKey: DEVICES_KEY });
    },
  });
}

export function useDevicePhotos(deviceId: string | undefined) {
  return useQuery({
    queryKey: ["device-photos", deviceId],
    enabled: !!deviceId,
    queryFn: async () => {
      if (!deviceId) return [];
      const { data, error } = await supabase
        .from("device_photos")
        .select("*")
        .eq("device_id", deviceId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useDeleteDevicePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, storagePath, deviceId }: { id: string; storagePath: string; deviceId: string }) => {
      await supabase.storage.from("device-photos").remove([storagePath]);
      const { error } = await supabase.from("device_photos").delete().eq("id", id);
      if (error) throw error;
      return deviceId;
    },
    onSuccess: (deviceId) => {
      queryClient.invalidateQueries({ queryKey: ["device-photos", deviceId] });
      queryClient.invalidateQueries({ queryKey: DEVICES_KEY });
    },
  });
}
