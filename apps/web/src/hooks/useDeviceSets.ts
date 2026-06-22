import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { DeviceSet, PacklistItem } from "@/types/database";

const SETS_KEY = ["device-sets"] as const;

export function useDeviceSets() {
  return useQuery({
    queryKey: SETS_KEY,
    queryFn: async (): Promise<DeviceSet[]> => {
      const { data, error } = await supabase
        .from("device_sets")
        .select("*, items:device_set_items(*, device:devices(*, barcodes(*)))")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as DeviceSet[];
    },
  });
}

export function useDeviceSet(id: string | undefined) {
  return useQuery({
    queryKey: [...SETS_KEY, id],
    enabled: !!id,
    queryFn: async (): Promise<DeviceSet | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("device_sets")
        .select("*, items:device_set_items(*, device:devices(*, barcodes(*)))")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as DeviceSet;
    },
  });
}

interface SetItemInput {
  deviceId: string;
  quantity: number;
}

export function useCreateDeviceSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      description,
      items,
    }: {
      name: string;
      description?: string | null;
      items: SetItemInput[];
    }) => {
      const { data: set, error } = await supabase
        .from("device_sets")
        .insert({ name, description: description ?? null })
        .select()
        .single();
      if (error) throw error;

      if (items.length > 0) {
        const { error: itemsError } = await supabase.from("device_set_items").insert(
          items.map((i) => ({ set_id: set.id, device_id: i.deviceId, quantity: i.quantity })),
        );
        if (itemsError) throw itemsError;
      }

      return set as DeviceSet;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SETS_KEY }),
  });
}

/** Ersetzt Name/Beschreibung und komplett die Item-Liste eines Sets (einfacher als Diffing für 2-3 Personen-Tool). */
export function useUpdateDeviceSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      name,
      description,
      items,
    }: {
      id: string;
      name: string;
      description?: string | null;
      items: SetItemInput[];
    }) => {
      const { error: setError } = await supabase
        .from("device_sets")
        .update({ name, description: description ?? null })
        .eq("id", id);
      if (setError) throw setError;

      const { error: deleteError } = await supabase.from("device_set_items").delete().eq("set_id", id);
      if (deleteError) throw deleteError;

      if (items.length > 0) {
        const { error: insertError } = await supabase
          .from("device_set_items")
          .insert(items.map((i) => ({ set_id: id, device_id: i.deviceId, quantity: i.quantity })));
        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: SETS_KEY });
      queryClient.invalidateQueries({ queryKey: [...SETS_KEY, variables.id] });
    },
  });
}

export function useDeleteDeviceSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("device_sets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SETS_KEY }),
  });
}

/**
 * "Entpackt" ein Set in die Packliste eines Jobs: jedes enthaltene Gerät wird
 * als ganz normaler Einzelposten angelegt (kein Gruppenbezug danach). Falls ein
 * Gerät aus dem Set schon auf der Packliste steht, wird dessen Menge erhöht
 * statt einen Duplikat-Posten anzulegen (gleiche Logik wie beim Scan).
 * `items` erlaubt, die Mengen pro Set-Bestandteil vor dem Hinzufügen anzupassen.
 */
export function useAddDeviceSetToJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      jobId,
      items,
    }: {
      jobId: string;
      items: SetItemInput[];
    }) => {
      if (items.length === 0) return [] as PacklistItem[];

      const { data: existing, error: existingError } = await supabase
        .from("packlist_items")
        .select("id, device_id, quantity")
        .eq("job_id", jobId)
        .in("device_id", items.map((i) => i.deviceId));
      if (existingError) throw existingError;

      const existingByDevice = new Map<string, { id: string; device_id: string; quantity: number }>(
        existing?.map((e) => [e.device_id, e]) ?? [],
      );

      const toUpdate = items.filter((i) => existingByDevice.has(i.deviceId));
      const toInsert = items.filter((i) => !existingByDevice.has(i.deviceId));

      const results: PacklistItem[] = [];

      for (const i of toUpdate) {
        const current = existingByDevice.get(i.deviceId)!;
        const { data, error } = await supabase
          .from("packlist_items")
          .update({ quantity: current.quantity + i.quantity })
          .eq("id", current.id)
          .select("*, device:devices(*, barcodes(*))")
          .single();
        if (error) throw error;
        results.push(data as PacklistItem);
      }

      if (toInsert.length > 0) {
        const { data, error } = await supabase
          .from("packlist_items")
          .insert(toInsert.map((i) => ({ job_id: jobId, device_id: i.deviceId, quantity: i.quantity })))
          .select("*, device:devices(*, barcodes(*))");
        if (error) throw error;
        results.push(...(data as PacklistItem[]));
      }

      return results;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["jobs", variables.jobId] });
    },
  });
}
