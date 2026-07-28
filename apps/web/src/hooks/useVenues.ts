import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Job, Venue } from "@/types/database";

const VENUES_KEY = ["venues"] as const;

export function useVenues() {
  return useQuery({
    queryKey: VENUES_KEY,
    queryFn: async (): Promise<Venue[]> => {
      const { data, error } = await supabase.from("venues").select("*").order("name", { ascending: true });
      if (error) throw error;
      return data as Venue[];
    },
  });
}

export function useVenue(id: string | undefined) {
  return useQuery({
    queryKey: [...VENUES_KEY, id],
    enabled: !!id,
    queryFn: async (): Promise<Venue | null> => {
      if (!id) return null;
      const { data, error } = await supabase.from("venues").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Venue;
    },
  });
}

/** Jobs an einem Ort — Vorbild für "zweiter Job an derselben Halle sieht die Notizen aus Job 1". */
export function useVenueJobs(venueId: string | undefined) {
  return useQuery({
    queryKey: ["venue-jobs", venueId],
    enabled: !!venueId,
    queryFn: async (): Promise<Job[]> => {
      if (!venueId) return [];
      const { data, error } = await supabase
        .from("jobs")
        .select("*, customer:customers(*)")
        .eq("venue_id", venueId)
        .is("deleted_at", null)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data as Job[];
    },
  });
}

export interface CreateVenueInput {
  name: string;
  address_street?: string | null;
  address_zip?: string | null;
  address_city?: string | null;
  contact_person?: string | null;
  contact_phone?: string | null;
  access_notes?: string | null;
  parking_notes?: string | null;
  power_notes?: string | null;
  special_notes?: string | null;
}

export function useCreateVenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateVenueInput): Promise<Venue> => {
      const { data, error } = await supabase.from("venues").insert(input).select().single();
      if (error) throw error;
      return data as Venue;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: VENUES_KEY }),
  });
}

export function useUpdateVenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: Partial<CreateVenueInput> & { id: string }): Promise<Venue> => {
      const { data, error } = await supabase.from("venues").update(fields).eq("id", id).select().single();
      if (error) throw error;
      return data as Venue;
    },
    onSuccess: (venue) => {
      queryClient.invalidateQueries({ queryKey: VENUES_KEY });
      queryClient.invalidateQueries({ queryKey: [...VENUES_KEY, venue.id] });
    },
  });
}

/** Löschen wirkt nur auf die Ortsakte — Jobs bleiben erhalten, venue_id wird null
 * (on delete set null, siehe Migration 0050). */
export function useDeleteVenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("venues").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VENUES_KEY });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}
