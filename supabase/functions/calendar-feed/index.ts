// EventTech Manager — Kalender-Feed (Edge Function, read-only)
//
// Liefert den internen Kalender als .ics-Datei (RFC 5545), damit er in Google
// Calendar / Apple Kalender ABONNIERT werden kann (einseitig: Änderungen bei
// uns erscheinen dort; Löschen schlägt durch, sobald der Client neu lädt).
//
// Auth läuft NICHT über JWT (Kalender-Clients senden keins) sondern über einen
// geheimen Token in der URL: /functions/v1/calendar-feed?token=<uuid>
// Darum ist verify_jwt für diese Funktion in config.toml abgeschaltet.
//
// Gespiegelt werden: interne Kalendertermine (calendar_entries) und der
// Job-Zeitplan (job_milestones). Das entspricht genau dem, was die App zeigt.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PRODID = "-//EventTech Manager//Kalender//DE";

function icsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n");
}

// Lange Zeilen nach RFC 5545 auf 75 Oktette umbrechen (mit Folge-Leerzeichen).
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 0) {
    parts.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  return parts.join("\r\n");
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) {
      return new Response("token fehlt", { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1) Token → Nutzer auflösen.
    const { data: feed } = await admin
      .from("calendar_feeds")
      .select("user_id")
      .eq("token", token)
      .maybeSingle();
    if (!feed) {
      return new Response("Ungültiger Token", { status: 404 });
    }

    // 2) Inhalte laden (Service-Role; interner Firmenkalender für angemeldete Mitarbeiter).
    const [{ data: entries }, { data: milestones }] = await Promise.all([
      admin
        .from("calendar_entries")
        .select("id, title, start_at, end_at, all_day, notes, job:jobs(location)")
        .order("start_at", { ascending: true }),
      admin
        .from("job_milestones")
        .select("id, title, at, job:jobs(title, location)")
        .order("at", { ascending: true }),
    ]);

    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      `PRODID:${PRODID}`,
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:EventTech",
      "X-WR-TIMEZONE:Europe/Berlin",
      // Empfehlung an den Client, wie oft neu geladen wird (Google/Apple halten sich
      // nicht strikt daran, aber es ist der korrekte Hinweis).
      "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
      "X-PUBLISHED-TTL:PT1H",
    ];

    const stamp = icsDate(new Date().toISOString());

    for (const e of (entries ?? []) as Array<{
      id: string;
      title: string;
      start_at: string;
      end_at: string;
      all_day: boolean;
      notes: string | null;
      job: { location: string | null } | null;
    }>) {
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:entry-${e.id}@eventtech-manager`);
      lines.push(`DTSTAMP:${stamp}`);
      lines.push(`DTSTART:${icsDate(e.start_at)}`);
      lines.push(`DTEND:${icsDate(e.end_at)}`);
      lines.push(fold(`SUMMARY:${escapeText(e.title)}`));
      if (e.notes) lines.push(fold(`DESCRIPTION:${escapeText(e.notes)}`));
      if (e.job?.location) lines.push(fold(`LOCATION:${escapeText(e.job.location)}`));
      lines.push("END:VEVENT");
    }

    for (const m of (milestones ?? []) as Array<{
      id: string;
      title: string;
      at: string;
      job: { title: string; location: string | null } | null;
    }>) {
      const start = new Date(m.at);
      const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 Std. Standarddauer
      const summary = m.job?.title ? `${m.job.title}: ${m.title}` : m.title;
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:milestone-${m.id}@eventtech-manager`);
      lines.push(`DTSTAMP:${stamp}`);
      lines.push(`DTSTART:${icsDate(m.at)}`);
      lines.push(`DTEND:${icsDate(end.toISOString())}`);
      lines.push(fold(`SUMMARY:${escapeText(summary)}`));
      if (m.job?.location) lines.push(fold(`LOCATION:${escapeText(m.job.location)}`));
      lines.push("END:VEVENT");
    }

    lines.push("END:VCALENDAR");

    return new Response(lines.join("\r\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="eventtech.ics"',
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : "Serverfehler", { status: 500 });
  }
});
