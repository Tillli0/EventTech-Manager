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
        .select("*, category:categories(*), barcodes(*), device_photos(*)")
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
        .select("*, category:categories(*), barcodes(*), device_photos(*)")
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
  daily_rental_price?: number | null;
  notes?: string | null;
  barcode: string;
  /**
   * true = Code stammt aus dem System-Vorschlag. Bei einer Kollision (z.B. weil
   * parallel angelegt wurde) wird automatisch der nächste freie Code genommen.
   * false = manuell eingegeben → bei Kollision wird ein klarer Fehler gemeldet,
   * der Code wird nicht stillschweigend verändert.
   */
  autoBarcode?: boolean;
  /** Gesamtbestand. Default 1 (Einzelstück). >1 = Mengen-Gerät, z.B. 20 Kabel. */
  stock_quantity?: number;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}

export function useCreateDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateDeviceInput) => {
      const { barcode, autoBarcode, ...deviceFields } = input;

      const { data: device, error: deviceError } = await supabase
        .from("devices")
        .insert(deviceFields)
        .select()
        .single();

      if (deviceError) throw deviceError;

      // Barcode anlegen. Bei automatischem Code und Kollision den nächsten freien
      // nehmen und erneut versuchen; bei manuellem Code bewusst nicht ändern.
      let code = barcode.trim();
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 10; attempt++) {
        const { error: barcodeError } = await supabase
          .from("barcodes")
          .insert({ device_id: device.id, code });

        if (!barcodeError) return device as Device;

        lastError = barcodeError;
        if (isUniqueViolation(barcodeError) && autoBarcode) {
          code = await nextFreeEtmCode();
          continue;
        }
        break;
      }

      // Barcode endgültig fehlgeschlagen → kein Gerät ohne Barcode zurücklassen.
      await supabase.from("devices").delete().eq("id", device.id);
      if (isUniqueViolation(lastError)) {
        throw new Error(`Barcode „${code}" ist bereits vergeben. Bitte einen anderen wählen.`);
      }
      throw lastError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEVICES_KEY });
      // Barcode-Vorschlag und Verfügbarkeitsprüfungen neu berechnen, damit der
      // nächste Dialog nicht denselben (jetzt vergebenen) Code anbietet.
      queryClient.invalidateQueries({ queryKey: ["barcodes"] });
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
      // Auch Jobs/Packlisten zeigen den Gerätestatus an (z.B. Status-Wechsel direkt
      // am Job-Posten) — daher mit auffrischen.
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export interface ImportDeviceRow {
  name: string;
  category?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  barcode?: string | null;
  location?: string | null;
  stock_quantity?: number | null;
  status?: DeviceStatus | null;
  daily_rental_price?: number | null;
  replacement_value?: number | null;
}

export interface ImportDevicesResult {
  created: number;
  updated: number;
  errors: { row: number; name: string; message: string }[];
}

/**
 * Import per CSV (Gegenstück zum CSV-Export der Inventarliste). Geräte werden über
 * den Barcode abgeglichen: vorhandener Barcode → Update des Geräts, sonst Neuanlage
 * (mit automatischem ETM-Code, falls kein Barcode angegeben ist). Kategorien werden
 * per Name nachgeschlagen und bei Bedarf neu angelegt.
 */
export function useImportDevices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rows: ImportDeviceRow[]): Promise<ImportDevicesResult> => {
      const result: ImportDevicesResult = { created: 0, updated: 0, errors: [] };
      const categoryCache = new Map<string, string>();

      async function resolveCategoryId(name: string | null | undefined): Promise<string | null> {
        const trimmed = name?.trim();
        if (!trimmed) return null;
        const key = trimmed.toLowerCase();
        if (categoryCache.has(key)) return categoryCache.get(key)!;

        const { data: existing } = await supabase
          .from("categories")
          .select("id")
          .ilike("name", trimmed)
          .is("parent_id", null)
          .maybeSingle();
        if (existing) {
          categoryCache.set(key, existing.id);
          return existing.id;
        }

        const { data: maxSort } = await supabase
          .from("categories")
          .select("sort_order")
          .order("sort_order", { ascending: false })
          .limit(1);
        const { data: created, error } = await supabase
          .from("categories")
          .insert({ name: trimmed, sort_order: (maxSort?.[0]?.sort_order ?? 0) + 1, parent_id: null })
          .select("id")
          .single();
        if (error) throw error;
        categoryCache.set(key, created.id);
        return created.id;
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          if (!row.name?.trim()) {
            result.errors.push({ row: i + 2, name: row.name ?? "", message: "Name fehlt." });
            continue;
          }

          const categoryId = await resolveCategoryId(row.category);
          const fields = {
            name: row.name.trim(),
            category_id: categoryId,
            manufacturer: row.manufacturer?.trim() || null,
            model: row.model?.trim() || null,
            location: row.location?.trim() || null,
            stock_quantity: row.stock_quantity && row.stock_quantity > 0 ? row.stock_quantity : 1,
            status: row.status ?? "verfuegbar",
            daily_rental_price: row.daily_rental_price ?? null,
            replacement_value: row.replacement_value ?? null,
          };

          const code = row.barcode?.trim();
          let existingDeviceId: string | null = null;
          if (code) {
            const { data: existingBarcode } = await supabase
              .from("barcodes")
              .select("device_id")
              .eq("code", code)
              .maybeSingle();
            existingDeviceId = existingBarcode?.device_id ?? null;
          }

          if (existingDeviceId) {
            const { error } = await supabase.from("devices").update(fields).eq("id", existingDeviceId);
            if (error) throw error;
            result.updated += 1;
          } else {
            const { data: device, error: deviceError } = await supabase
              .from("devices")
              .insert(fields)
              .select("id")
              .single();
            if (deviceError) throw deviceError;

            const finalCode = code || (await nextFreeEtmCode());
            const { error: barcodeError } = await supabase
              .from("barcodes")
              .insert({ device_id: device.id, code: finalCode });
            if (barcodeError) {
              await supabase.from("devices").delete().eq("id", device.id);
              throw barcodeError;
            }
            result.created += 1;
          }
        } catch (err) {
          result.errors.push({
            row: i + 2,
            name: row.name ?? "",
            message: err instanceof Error ? err.message : "Unbekannter Fehler.",
          });
        }
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEVICES_KEY });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["barcodes"] });
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

// ============================================================
// INTERNE BARCODES (Format ETM-00001)
// ============================================================

const ETM_PREFIX = "ETM-";
const ETM_PAD = 5;

function formatEtm(n: number): string {
  return `${ETM_PREFIX}${String(n).padStart(ETM_PAD, "0")}`;
}

/** Ist dieser Code bereits in der barcodes-Tabelle vergeben? */
async function isBarcodeTaken(code: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("barcodes")
    .select("id")
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

/**
 * Liefert den nächsten freien ETM-Code. Startet bei (höchste vergebene Nummer + 1)
 * und zählt hoch, bis ein garantiert freier Code gefunden ist — fängt damit auch
 * Lücken/manuell vergebene Codes ab. Damit ist der Vorschlag immer wirklich frei.
 */
async function nextFreeEtmCode(): Promise<string> {
  const { data, error } = await supabase
    .from("barcodes")
    .select("code")
    .like("code", `${ETM_PREFIX}%`)
    .order("code", { ascending: false })
    .limit(1);
  if (error) throw error;

  const lastCode = data?.[0]?.code;
  let n = (lastCode ? parseInt(lastCode.replace(ETM_PREFIX, ""), 10) || 0 : 0) + 1;

  for (let i = 0; i < 1000; i++) {
    const candidate = formatEtm(n);
    if (!(await isBarcodeTaken(candidate))) return candidate;
    n++;
  }
  throw new Error("Kein freier Barcode gefunden.");
}

/** Nächste freie interne Barcode-Nummer im Format ETM-00001 vorschlagen */
export function useNextBarcodeSuggestion() {
  return useQuery({
    queryKey: ["barcodes", "next-suggestion"],
    // Beim erneuten Öffnen des Dialogs immer neu rechnen, damit nie ein bereits
    // vergebener Code vorgeschlagen wird.
    staleTime: 0,
    queryFn: nextFreeEtmCode,
  });
}

/**
 * Prüft live, ob ein eingegebener Barcode noch frei ist. Liefert `true` = frei.
 * Wird im Anlegen-Dialog für die Sofort-Rückmeldung genutzt.
 */
export function useBarcodeAvailability(code: string | undefined) {
  const trimmed = code?.trim() ?? "";
  return useQuery({
    queryKey: ["barcodes", "available", trimmed],
    enabled: trimmed.length > 0,
    queryFn: async (): Promise<boolean> => !(await isBarcodeTaken(trimmed)),
  });
}

/** Öffentliche URL für ein im device-photos-Bucket gespeichertes Bild. */
export function devicePhotoUrl(storagePath: string): string {
  return supabase.storage.from("device-photos").getPublicUrl(storagePath).data.publicUrl;
}

/** Cover-Bild eines Geräts bestimmt (alle anderen werden auf is_cover=false gesetzt). */
export function useSetCoverPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, deviceId }: { id: string; deviceId: string }) => {
      const { error: clearError } = await supabase
        .from("device_photos")
        .update({ is_cover: false })
        .eq("device_id", deviceId);
      if (clearError) throw clearError;

      const { error } = await supabase
        .from("device_photos")
        .update({ is_cover: true })
        .eq("id", id);
      if (error) throw error;
      return deviceId;
    },
    onSuccess: (deviceId) => {
      queryClient.invalidateQueries({ queryKey: ["device-photos", deviceId] });
      queryClient.invalidateQueries({ queryKey: [...DEVICES_KEY, deviceId] });
      queryClient.invalidateQueries({ queryKey: DEVICES_KEY });
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
      queryClient.invalidateQueries({ queryKey: ["device-photos", deviceId] });
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
