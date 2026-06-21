import type { CalendarEntry } from "@/types/database";

/**
 * Erzeugt eine .ics-Datei aus Kalendereinträgen (RFC 5545) und löst den
 * Download aus. Damit lässt sich der interne Kalender in Apple Calendar
 * (oder jeden anderen iCal-fähigen Client) importieren bzw. abonnieren.
 */
export function exportToIcs(entries: CalendarEntry[], filename = "eventtech-kalender.ics") {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EventTech Manager//DE",
    "CALSCALE:GREGORIAN",
  ];

  for (const entry of entries) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${entry.id}@eventtech-manager`,
      `DTSTAMP:${toIcsDate(new Date())}`,
      `DTSTART:${toIcsDate(new Date(entry.start_at))}`,
      `DTEND:${toIcsDate(new Date(entry.end_at))}`,
      `SUMMARY:${escapeIcsText(entry.title)}`,
      ...(entry.notes ? [`DESCRIPTION:${escapeIcsText(entry.notes)}`] : []),
      ...(entry.job?.location ? [`LOCATION:${escapeIcsText(entry.job.location)}`] : []),
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");

  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}
