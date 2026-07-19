import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Job, JobStatus, PacklistItem, JobMilestone } from "@/types/database";
import { randomJobColor } from "@/types/database";
import { recordDeviceHistory } from "@/hooks/useDeviceHistory";
import { STOCK_BINDING_STATUSES } from "@/lib/availability";

export { sumBookedQuantity } from "@/lib/availability";

const JOBS_KEY = ["jobs"] as const;

/**
 * Mehrtägige Jobs sollen im Kalender (Wochen-/Tagesansicht) als durchgezogener
 * Balken oben erscheinen statt das Stundenraster über alle Tage zu blocken —
 * genau wie "normale" ganztägige Termine. Daher: all_day automatisch true,
 * sobald Start- und Enddatum auf unterschiedliche Kalendertage fallen.
 */
function isMultiDay(startDate: string, endDate: string): boolean {
  return startDate.slice(0, 10) !== endDate.slice(0, 10);
}

export function useJobs() {
  return useQuery({
    queryKey: JOBS_KEY,
    queryFn: async (): Promise<Job[]> => {
      const { data, error } = await supabase
        .from("jobs")
        // Zeitplan-Termine mitladen — für „komplett vergangen" (Termine nach dem
        // Enddatum) und die Zeitplan-Liste im Überblick (nächster Job). Packlisten-
        // Mengen (ohne Geräte-Join) für den Fortschrittsbalken in der Job-Karte,
        // Zuweisungen für die Avatar-Gruppe.
        .select(
          "*, customer:customers(*), milestones:job_milestones(id, title, at), packlist_items(id, job_id, device_id, quantity, quantity_picked_up, quantity_returned_ok, quantity_damaged, quantity_missing, picked_up_at, returned_at, is_damaged_on_return, damage_notes, created_at), assignees:job_assignees(user_id)",
        )
        .is("deleted_at", null)
        .order("start_date", { ascending: true });
      if (error) throw error;
      return data as Job[];
    },
  });
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: [...JOBS_KEY, id],
    enabled: !!id,
    queryFn: async (): Promise<Job | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("jobs")
        .select(
          "*, customer:customers(*), packlist_items(*, device:devices(*, category:categories(*), location_ref:locations!location_id(*), barcodes(*))), milestones:job_milestones(*), assignees:job_assignees(user_id)",
        )
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Job;
    },
  });
}

/** Jobs im Papierkorb (Soft-Delete), zuletzt gelöschte zuerst. */
export function useDeletedJobs() {
  return useQuery({
    queryKey: [...JOBS_KEY, "deleted"],
    queryFn: async (): Promise<Job[]> => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, customer:customers(*)")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      if (error) throw error;
      return data as Job[];
    },
  });
}

/** Job in den Papierkorb verschieben (Soft-Delete). */
export function useSoftDeleteJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("jobs")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JOBS_KEY });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });
}

/** Job aus dem Papierkorb wiederherstellen. */
export function useRestoreJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("jobs").update({ deleted_at: null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JOBS_KEY });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });
}

/** Job endgültig löschen (inkl. abhängiger Daten via FK-Cascade). */
export function useHardDeleteJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("jobs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JOBS_KEY });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });
}

interface CreateJobInput {
  title: string;
  customer_id: string | null;
  location?: string | null;
  start_date: string;
  end_date: string;
  notes?: string | null;
  /** Wird automatisch zufällig vorbelegt, falls nicht angegeben. */
  color?: string;
  /** Optional vorab geladener Kunde, um einen zweiten Request für den Kalendertitel zu sparen. */
  customerLabel?: string | null;
  /** Direkt beim Anlegen zugewiesene Nutzer (siehe Reihenfolge-Hinweis unten). */
  assigneeIds?: string[];
}

/**
 * Legt einen Job an und erzeugt automatisch einen passenden Kalendereintrag
 * (1:1 zu Job-Start/Ende, Titel = Kundenname, Fallback Job-Titel).
 * Die Job-Farbe wird, falls nicht explizit übergeben, zufällig aus der Palette gewählt.
 *
 * Reihenfolge bewusst: Job **ohne** `.select()` anlegen (kein RLS-Zwang, die neue
 * Zeile sofort sehen zu müssen), dann Zuweisungen schreiben, erst danach den Job
 * zurückholen. Grund: `can_see_job()` lässt Nutzer mit `job_view_mode: zugewiesene`
 * nur Jobs sehen, denen sie zugewiesen sind — direkt nach dem Insert (vor der
 * Zuweisung) wäre das noch nicht der Fall, ein `.select()` an dieser Stelle schlug
 * für solche Nutzer mit „403, RLS-Policy verletzt" fehl (gefunden 2026-07-19 beim
 * Rollen-Beweis, PLAN-UI-NEUSCHNITT.md U3).
 */
export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ customerLabel, color, assigneeIds, ...input }: CreateJobInput) => {
      const id = crypto.randomUUID();
      const row = { ...input, id, color: color ?? randomJobColor() };

      const { error } = await supabase.from("jobs").insert(row);
      if (error) throw error;

      if (assigneeIds && assigneeIds.length > 0) {
        const { error: assigneeError } = await supabase
          .from("job_assignees")
          .insert(assigneeIds.map((user_id) => ({ job_id: id, user_id })));
        if (assigneeError) throw assigneeError;
      }

      const { error: calendarError } = await supabase.from("calendar_entries").insert({
        job_id: id,
        title: customerLabel?.trim() || row.title,
        start_at: row.start_date,
        end_at: row.end_date,
        all_day: isMultiDay(row.start_date, row.end_date),
        source: "intern",
      });
      // Der Job ist bereits angelegt; ein Kalenderfehler soll das nicht rückgängig machen,
      // wird aber sichtbar gemacht statt verschluckt.
      if (calendarError) throw calendarError;

      // Erneutes Lesen kann für Nutzer ohne Sicht auf eigene, unzugewiesene Jobs ins
      // Leere laufen (s.o.) — dann reicht die lokal zusammengesetzte Zeile als Rückgabe.
      const { data: job } = await supabase.from("jobs").select().eq("id", id).maybeSingle();
      return (job ?? { ...row, status: "anfrage", created_by: null, deleted_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }) as Job;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JOBS_KEY });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });
}

export function useUpdateJobStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: JobStatus }) => {
      const { data, error } = await supabase
        .from("jobs")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Job;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: JOBS_KEY });
      queryClient.invalidateQueries({ queryKey: [...JOBS_KEY, variables.id] });
    },
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, customerLabel, ...fields }: Partial<Job> & { id: string; customerLabel?: string | null }) => {
      const { data, error } = await supabase
        .from("jobs")
        .update(fields)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      const job = data as Job;

      // Falls Start/Ende/Titel sich geändert haben, den verknüpften (internen)
      // Kalendereintrag mitziehen — inkl. Neuberechnung von all_day, damit ein
      // nachträglich verlängerter Job auch als Balken statt Stundenblock erscheint.
      if (fields.start_date || fields.end_date || fields.title || customerLabel !== undefined) {
        const calendarUpdate: Record<string, unknown> = {};
        if (fields.start_date) calendarUpdate.start_at = job.start_date;
        if (fields.end_date) calendarUpdate.end_at = job.end_date;
        if (fields.start_date || fields.end_date) {
          calendarUpdate.all_day = isMultiDay(job.start_date, job.end_date);
        }
        if (customerLabel !== undefined) calendarUpdate.title = customerLabel?.trim() || job.title;
        else if (fields.title) calendarUpdate.title = fields.title;

        if (Object.keys(calendarUpdate).length > 0) {
          const { error: calendarError } = await supabase
            .from("calendar_entries")
            .update(calendarUpdate)
            .eq("job_id", id)
            .eq("source", "intern");
          if (calendarError) throw calendarError;
        }
      }

      return job;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: JOBS_KEY });
      queryClient.invalidateQueries({ queryKey: [...JOBS_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      queryClient.invalidateQueries({ queryKey: ["job-milestones"] });
    },
  });
}

// ============================================================
// Packliste
// ============================================================

export function useAddPacklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      jobId,
      deviceId,
      quantity = 1,
    }: {
      jobId: string;
      deviceId: string;
      quantity?: number;
    }) => {
      const { data, error } = await supabase
        .from("packlist_items")
        .insert({ job_id: jobId, device_id: deviceId, quantity })
        .select("*, device:devices(*, barcodes(*))")
        .single();
      if (error) throw error;
      return data as PacklistItem;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...JOBS_KEY, variables.jobId] });
    },
  });
}

/**
 * Fügt ein Gerät per Scan zur Packliste hinzu. Steht es schon auf der Liste
 * (und ist noch nicht ausgegeben), wird die Menge um 1 erhöht statt einen
 * zweiten Posten anzulegen — so kann man ein Mengen-Gerät (z.B. Kabel) einfach
 * mehrfach scannen, um die Stückzahl hochzuzählen.
 */
export function useScanPacklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      jobId,
      deviceId,
      existingItem,
    }: {
      jobId: string;
      deviceId: string;
      /** Bereits vorhandener Packlist-Posten für dieses Gerät auf diesem Job, falls schon vorhanden. */
      existingItem?: Pick<PacklistItem, "id" | "quantity"> | null;
    }) => {
      if (existingItem) {
        const { data, error } = await supabase
          .from("packlist_items")
          .update({ quantity: existingItem.quantity + 1 })
          .eq("id", existingItem.id)
          .select("*, device:devices(*, barcodes(*))")
          .single();
        if (error) throw error;
        return { item: data as PacklistItem, wasNew: false };
      }

      const { data, error } = await supabase
        .from("packlist_items")
        .insert({ job_id: jobId, device_id: deviceId, quantity: 1 })
        .select("*, device:devices(*, barcodes(*))")
        .single();
      if (error) throw error;
      return { item: data as PacklistItem, wasNew: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...JOBS_KEY, variables.jobId] });
    },
  });
}

/** Ändert die gewünschte Menge eines Packlist-Postens (z.B. manuelle Eingabe statt Scan). */
export function useUpdatePacklistItemQuantity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, quantity }: { id: string; jobId: string; quantity: number }) => {
      const { data, error } = await supabase
        .from("packlist_items")
        .update({ quantity })
        .eq("id", id)
        .select("*, device:devices(*, barcodes(*))")
        .single();
      if (error) throw error;
      return data as PacklistItem;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...JOBS_KEY, variables.jobId] });
    },
  });
}

/** Fügt mehrere Geräte gleichzeitig zur Packliste hinzu (z.B. aus der Inventar-Übersicht), je mit eigener Menge. */
export function useAddPacklistItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      jobId,
      items,
    }: {
      jobId: string;
      /** Geräte-IDs mit jeweiliger gewünschter Menge (Default 1). */
      items: { deviceId: string; quantity?: number }[];
    }) => {
      if (items.length === 0) return [];
      const { data, error } = await supabase
        .from("packlist_items")
        .insert(
          items.map(({ deviceId, quantity }) => ({
            job_id: jobId,
            device_id: deviceId,
            quantity: quantity ?? 1,
          })),
        )
        .select("*, device:devices(*, barcodes(*))");
      if (error) throw error;
      return data as PacklistItem[];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...JOBS_KEY, variables.jobId] });
    },
  });
}

export function useRemovePacklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, jobId }: { id: string; jobId: string }) => {
      const { error } = await supabase.from("packlist_items").delete().eq("id", id);
      if (error) throw error;
      return jobId;
    },
    onSuccess: (jobId) => {
      queryClient.invalidateQueries({ queryKey: [...JOBS_KEY, jobId] });
    },
  });
}

/**
 * Gibt eine bestimmte Menge eines Packlist-Postens aus (Standard: den vollen Rest,
 * der noch nicht ausgegeben wurde — passend für Einzelstücke per Klick).
 * quantity_picked_up wird dabei erhöht, nicht ersetzt, damit Ausgabe in mehreren
 * Schritten möglich bleibt.
 */
export function useMarkPacklistItemPickedUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      jobId,
      additionalQuantity,
    }: {
      id: string;
      jobId: string;
      /** Wie viele Stück zusätzlich ausgegeben werden. Default: gesamter offener Rest. */
      additionalQuantity?: number;
    }) => {
      const { data: current, error: fetchError } = await supabase
        .from("packlist_items")
        .select("device_id, quantity, quantity_picked_up")
        .eq("id", id)
        .single();
      if (fetchError) throw fetchError;

      const remaining = current.quantity - current.quantity_picked_up;
      const amount = additionalQuantity ?? remaining;
      if (amount <= 0) {
        return { data: current, jobId, deviceId: current.device_id };
      }

      const { data, error } = await supabase
        .from("packlist_items")
        .update({
          quantity_picked_up: current.quantity_picked_up + amount,
          picked_up_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      await recordDeviceHistory({
        device_id: current.device_id,
        event_type: "ausgegeben",
        job_id: jobId,
        quantity: amount,
      });

      return { data, jobId, deviceId: current.device_id };
    },
    onSuccess: async ({ jobId, deviceId }) => {
      // Gerätestatus nur bei Einzelstücken auf "ausgeliehen" setzen — bei
      // Mengen-Geräten ist der binäre Status nicht aussagekräftig (es kann
      // gleichzeitig verfügbarer und ausgeliehener Bestand existieren).
      const { data: device } = await supabase
        .from("devices")
        .select("stock_quantity")
        .eq("id", deviceId)
        .single();
      if (device && device.stock_quantity === 1) {
        await supabase.from("devices").update({ status: "ausgeliehen" }).eq("id", deviceId);
      }
      queryClient.invalidateQueries({ queryKey: [...JOBS_KEY, jobId] });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["devices-out-now-map"] });
      queryClient.invalidateQueries({ queryKey: ["device-history", deviceId] });
    },
  });
}

/**
 * Macht eine Ausgabe rückgängig (Versehen): setzt quantity_picked_up auf die
 * bereits zurückgemeldete Menge zurück (bei nichts zurückgemeldet → 0). Bereits
 * zurückgegebene Einheiten lassen sich nicht „ent-ausgeben".
 */
export function useUndoPickup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, jobId }: { id: string; jobId: string }) => {
      const { data: current, error } = await supabase
        .from("packlist_items")
        .select("device_id, quantity_returned_ok, quantity_damaged, quantity_missing")
        .eq("id", id)
        .single();
      if (error) throw error;

      const alreadyReturned =
        current.quantity_returned_ok + current.quantity_damaged + current.quantity_missing;
      const update: Record<string, unknown> = { quantity_picked_up: alreadyReturned };
      if (alreadyReturned === 0) update.picked_up_at = null;

      const { error: updErr } = await supabase.from("packlist_items").update(update).eq("id", id);
      if (updErr) throw updErr;

      // Einzelstück-Status zurücksetzen, wenn nichts mehr ausgegeben ist.
      if (alreadyReturned === 0) {
        const { data: device } = await supabase
          .from("devices")
          .select("stock_quantity")
          .eq("id", current.device_id)
          .single();
        if (device && device.stock_quantity === 1) {
          await supabase.from("devices").update({ status: "verfuegbar" }).eq("id", current.device_id);
        }
      }
      return { jobId, deviceId: current.device_id };
    },
    onSuccess: ({ jobId, deviceId }) => {
      queryClient.invalidateQueries({ queryKey: [...JOBS_KEY, jobId] });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["devices-out-now-map"] });
      queryClient.invalidateQueries({ queryKey: ["device-history", deviceId] });
    },
  });
}

/**
 * Erfasst eine Rückgabe in einem Schritt, aufgeteilt nach Stückzahl: intakt
 * zurück / defekt / fehlend. Teilrückgaben sind möglich — der Rest bleibt als
 * "noch ausgegeben" auf dem Posten stehen und kann später nachgemeldet werden.
 */
export function useReturnPacklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      jobId,
      returnedOk,
      damaged,
      missing,
      damageNotes,
      locationId,
    }: {
      id: string;
      jobId: string;
      returnedOk: number;
      damaged: number;
      missing: number;
      damageNotes?: string;
      /** Lagerort, an dem ausgeladen wird — wird für intakt zurückgegebene Einheiten am Gerät gesetzt. */
      locationId?: string | null;
    }) => {
      const { data: current, error: fetchError } = await supabase
        .from("packlist_items")
        .select("device_id, quantity_returned_ok, quantity_damaged, quantity_missing, damage_notes")
        .eq("id", id)
        .single();
      if (fetchError) throw fetchError;

      const update: Record<string, unknown> = {
        quantity_returned_ok: current.quantity_returned_ok + returnedOk,
        quantity_damaged: current.quantity_damaged + damaged,
        quantity_missing: current.quantity_missing + missing,
        returned_at: new Date().toISOString(),
      };
      if (damaged > 0) {
        update.is_damaged_on_return = true;
        update.damage_notes = damageNotes?.trim()
          ? [current.damage_notes, damageNotes.trim()].filter(Boolean).join(" · ")
          : current.damage_notes;
      }

      const { data: item, error } = await supabase
        .from("packlist_items")
        .update(update)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      // History: Rückgabe gesamt protokollieren.
      await recordDeviceHistory({
        device_id: current.device_id,
        event_type: "zurueck",
        job_id: jobId,
        quantity: returnedOk + damaged + missing,
        note: missing > 0 ? `${missing}× fehlend` : null,
      });

      const { data: device } = await supabase
        .from("devices")
        .select("stock_quantity, defective_quantity, location_id")
        .eq("id", current.device_id)
        .single();

      // Defekte Rückgaben dauerhaft als defekt zählen (rechnet aus der
      // Verfügbarkeit heraus) und protokollieren.
      if (damaged > 0 && device) {
        const nextDefective = Math.min(device.stock_quantity, (device.defective_quantity ?? 0) + damaged);
        await supabase.from("devices").update({ defective_quantity: nextDefective }).eq("id", current.device_id);
        await recordDeviceHistory({
          device_id: current.device_id,
          event_type: "defekt",
          job_id: jobId,
          quantity: damaged,
          note: damageNotes?.trim() || null,
        });
      }

      // Beim Ausladen den Lagerort der intakt zurückgegebenen Einheiten setzen.
      if (locationId && returnedOk > 0 && device && device.location_id !== locationId) {
        await supabase.from("devices").update({ location_id: locationId }).eq("id", current.device_id);
        await recordDeviceHistory({
          device_id: current.device_id,
          event_type: "lagerort",
          job_id: jobId,
          quantity: returnedOk,
          from_location_id: device.location_id ?? null,
          to_location_id: locationId,
        });
      }

      // Einzelstück-Status weiterhin pflegen (verfügbar/defekt).
      if (device && device.stock_quantity === 1) {
        await supabase
          .from("devices")
          .update({ status: damaged > 0 ? "defekt" : "verfuegbar" })
          .eq("id", current.device_id);
      }

      return { item, jobId, deviceId: current.device_id };
    },
    onSuccess: ({ jobId, deviceId }) => {
      queryClient.invalidateQueries({ queryKey: [...JOBS_KEY, jobId] });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["devices-out-now-map"] });
      queryClient.invalidateQueries({ queryKey: ["device-history", deviceId] });
    },
  });
}

/**
 * Lädt für den angegebenen Zeitraum alle Geräte, die im Zeitraum bereits (teilweise)
 * über andere aktive Jobs verplant sind — als Map deviceId -> Liste der Buchungen
 * (inkl. jeweiliger Menge). Ein Konflikt liegt erst vor, wenn die Summe der fremden
 * Mengen den Lagerbestand (stock_quantity) übersteigt; das wird hier nicht entschieden
 * (das Gerät kennt der Aufrufer ja meist schon), sondern nur die rohen Buchungen geliefert.
 */
export function useDevicesAvailabilityMap(
  startDate: string | undefined,
  endDate: string | undefined,
  excludeJobId?: string,
) {
  return useQuery({
    queryKey: ["devices-availability-map", startDate, endDate, excludeJobId],
    enabled: !!startDate && !!endDate,
    queryFn: async () => {
      let query = supabase
        .from("packlist_items")
        .select("device_id, job_id, quantity, jobs!inner(id, title, status, start_date, end_date)")
        .in("jobs.status", [...STOCK_BINDING_STATUSES])
        // Jobs im Papierkorb binden keinen Bestand mehr.
        .is("jobs.deleted_at", null)
        .lt("jobs.start_date", endDate)
        .gt("jobs.end_date", startDate);

      if (excludeJobId) {
        query = query.neq("job_id", excludeJobId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const map = new Map<
        string,
        { id: string; title: string; start_date: string; end_date: string; quantity: number }[]
      >();
      for (const row of data as unknown as {
        device_id: string;
        quantity: number;
        jobs: { id: string; title: string; start_date: string; end_date: string };
      }[]) {
        if (!row.jobs) continue;
        const existing = map.get(row.device_id) ?? [];
        existing.push({ ...row.jobs, quantity: row.quantity });
        map.set(row.device_id, existing);
      }
      return map;
    },
  });
}

/**
 * Pro Gerät: wie viele Einheiten sind AKTUELL ausgegeben (über aktive Jobs noch
 * nicht zurückgemeldet) — Summe von quantityStillOut. Basis für die abgeleitete
 * Verfügbarkeit (verfügbar = Lager − defekt − aktuell ausgegeben).
 */
export function useDevicesOutNowMap() {
  return useQuery({
    queryKey: ["devices-out-now-map"],
    queryFn: async (): Promise<Map<string, number>> => {
      const { data, error } = await supabase
        .from("packlist_items")
        .select(
          "device_id, quantity_picked_up, quantity_returned_ok, quantity_damaged, quantity_missing, jobs!inner(status, deleted_at)",
        )
        .in("jobs.status", [...STOCK_BINDING_STATUSES])
        .is("jobs.deleted_at", null);
      if (error) throw error;

      const map = new Map<string, number>();
      for (const row of data as unknown as {
        device_id: string;
        quantity_picked_up: number;
        quantity_returned_ok: number;
        quantity_damaged: number;
        quantity_missing: number;
      }[]) {
        const stillOut =
          row.quantity_picked_up - row.quantity_returned_ok - row.quantity_damaged - row.quantity_missing;
        if (stillOut > 0) map.set(row.device_id, (map.get(row.device_id) ?? 0) + stillOut);
      }
      return map;
    },
  });
}

/**
 * Aktive/anstehende Buchungen eines Geräts: in welchen laufenden oder kommenden
 * Jobs (Anfrage/Bestätigt/Läuft, Ende ≥ heute) ist es verplant — für die Anzeige
 * „aktuell verplant in …" auf der Geräte-Detailseite.
 */
export function useDeviceBookings(deviceId: string | undefined) {
  return useQuery({
    queryKey: ["device-bookings", deviceId],
    enabled: !!deviceId,
    queryFn: async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("packlist_items")
        .select("job_id, quantity, jobs!inner(id, title, status, start_date, end_date)")
        .eq("device_id", deviceId)
        .in("jobs.status", [...STOCK_BINDING_STATUSES])
        .is("jobs.deleted_at", null)
        .gte("jobs.end_date", todayStart.toISOString());
      if (error) throw error;
      const rows = data as unknown as {
        quantity: number;
        jobs: { id: string; title: string; status: JobStatus; start_date: string; end_date: string };
      }[];
      return rows
        .filter((r) => r.jobs)
        .map((r) => ({ ...r.jobs, quantity: r.quantity }))
        .sort((a, b) => a.start_date.localeCompare(b.start_date));
    },
  });
}

/**
 * Prüft, ob ein Gerät im angegebenen Zeitraum bereits (teilweise) über andere
 * aktive Jobs (Anfrage/Bestätigt/Läuft) verplant ist — inkl. jeweiliger Menge.
 * Bei Mengen-Geräten (stock_quantity > 1) entscheidet erst der Aufrufer anhand
 * von stock_quantity, ob die Summe tatsächlich einen Konflikt darstellt
 * (Summe fremder Buchungen + eigene gewünschte Menge > stock_quantity).
 */
export function useDeviceAvailability(
  deviceId: string | undefined,
  startDate: string | undefined,
  endDate: string | undefined,
  excludeJobId?: string,
) {
  return useQuery({
    queryKey: ["device-availability", deviceId, startDate, endDate, excludeJobId],
    enabled: !!deviceId && !!startDate && !!endDate,
    queryFn: async () => {
      let query = supabase
        .from("packlist_items")
        .select("job_id, quantity, jobs!inner(id, title, status, start_date, end_date)")
        .eq("device_id", deviceId)
        .in("jobs.status", [...STOCK_BINDING_STATUSES])
        .is("jobs.deleted_at", null)
        .lt("jobs.start_date", endDate)
        .gt("jobs.end_date", startDate);

      if (excludeJobId) {
        query = query.neq("job_id", excludeJobId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as {
        job_id: string;
        quantity: number;
        jobs: { id: string; title: string; start_date: string; end_date: string };
      }[];
    },
  });
}

// ============================================================
// Unterevents (Meilensteine) — z.B. Aufbau, Abbau, Eventstart
// ============================================================

export function useCreateJobMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobId, title, at }: { jobId: string; title: string; at: string }) => {
      const { data, error } = await supabase
        .from("job_milestones")
        .insert({ job_id: jobId, title, at })
        .select()
        .single();
      if (error) throw error;
      return data as JobMilestone;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...JOBS_KEY, variables.jobId] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      queryClient.invalidateQueries({ queryKey: ["job-milestones"] });
    },
  });
}

export function useUpdateJobMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      // jobId nur hier herausgelöst, damit es nicht im DB-Update landet (genutzt in onSuccess).
      jobId: _jobId,
      ...fields
    }: { id: string; jobId: string } & Partial<Pick<JobMilestone, "title" | "at">>) => {
      const { data, error } = await supabase
        .from("job_milestones")
        .update(fields)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as JobMilestone;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...JOBS_KEY, variables.jobId] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      queryClient.invalidateQueries({ queryKey: ["job-milestones"] });
    },
  });
}

export function useDeleteJobMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, jobId }: { id: string; jobId: string }) => {
      const { error } = await supabase.from("job_milestones").delete().eq("id", id);
      if (error) throw error;
      return jobId;
    },
    onSuccess: (jobId) => {
      queryClient.invalidateQueries({ queryKey: [...JOBS_KEY, jobId] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      queryClient.invalidateQueries({ queryKey: ["job-milestones"] });
    },
  });
}

/** Öffentliche URL für ein im job-photos-Bucket gespeichertes Zeitplan-Foto. */
export function milestonePhotoUrl(path: string): string {
  return supabase.storage.from("job-photos").getPublicUrl(path).data.publicUrl;
}

/** Lädt ein Foto zu einem Zeitplan-Programmpunkt hoch und speichert dessen Pfad. */
export function useUploadMilestonePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, jobId, file }: { id: string; jobId: string; file: File }) => {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${jobId}/${id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("job-photos").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { error } = await supabase.from("job_milestones").update({ photo_path: path }).eq("id", id);
      if (error) throw error;
      return jobId;
    },
    onSuccess: (jobId) => {
      queryClient.invalidateQueries({ queryKey: [...JOBS_KEY, jobId] });
    },
  });
}

/** Entfernt das Foto eines Zeitplan-Programmpunkts wieder. */
export function useRemoveMilestonePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, jobId, photoPath }: { id: string; jobId: string; photoPath: string | null }) => {
      if (photoPath) await supabase.storage.from("job-photos").remove([photoPath]);
      const { error } = await supabase.from("job_milestones").update({ photo_path: null }).eq("id", id);
      if (error) throw error;
      return jobId;
    },
    onSuccess: (jobId) => {
      queryClient.invalidateQueries({ queryKey: [...JOBS_KEY, jobId] });
    },
  });
}
