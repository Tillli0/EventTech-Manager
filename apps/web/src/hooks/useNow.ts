import { useEffect, useState } from "react";

/**
 * Liefert die aktuelle Zeit und aktualisiert sich jede Minute — für die rote
 * "Jetzt"-Linie im Kalender (wie bei Google Calendar). Synchronisiert auf den
 * Minutenwechsel, statt stur alle 60s ab Mount.
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const msToNextMinute = (60 - new Date().getSeconds()) * 1000;
    const timeout = setTimeout(() => {
      setNow(new Date());
      interval = setInterval(() => setNow(new Date()), 60_000);
    }, msToNextMinute);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  return now;
}
