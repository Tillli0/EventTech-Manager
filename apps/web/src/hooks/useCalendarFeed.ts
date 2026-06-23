import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const FEED_KEY = ["calendar-feed-token"] as const;

/** Basis-URL des Abo-Feeds (ohne Token).
 *
 * Bevorzugt VITE_CALENDAR_FEED_BASE_URL (die öffentliche Tunnel-/Domain-Adresse,
 * über die Google/Apple den Feed abrufen). Ist sie nicht gesetzt, wird die
 * normale Supabase-URL benutzt (z. B. LAN-IP — funktioniert nur im selben Netz).
 */
function feedBaseUrl(): string {
  const explicit = import.meta.env.VITE_CALENDAR_FEED_BASE_URL as string | undefined;
  const base = (explicit || (import.meta.env.VITE_SUPABASE_URL as string)).replace(/\/$/, "");
  return `${base}/functions/v1/calendar-feed`;
}

export function calendarFeedUrl(token: string): string {
  return `${feedBaseUrl()}?token=${token}`;
}

/** Holt (oder erzeugt) den persönlichen Abo-Token des angemeldeten Nutzers. */
export function useCalendarFeedToken() {
  return useQuery({
    queryKey: FEED_KEY,
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase.rpc("get_or_create_calendar_feed");
      if (error) throw error;
      return data as string;
    },
  });
}

/** Würfelt den Token neu — alte Abo-Links werden damit ungültig. */
export function useRegenerateCalendarFeed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<string> => {
      const { data, error } = await supabase.rpc("regenerate_calendar_feed");
      if (error) throw error;
      return data as string;
    },
    onSuccess: (token) => {
      queryClient.setQueryData(FEED_KEY, token);
    },
  });
}
