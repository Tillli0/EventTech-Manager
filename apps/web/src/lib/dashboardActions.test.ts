import { describe, it, expect } from "vitest";
import { buildActionItems, faelligkeitsText, type OffenerPosten } from "@/lib/dashboardActions";
import type { Subrental, Task, WebsiteLead } from "@/types/database";

const HEUTE = new Date("2026-08-07T10:00:00Z");

function task(over: Partial<Task> & { id: string; title: string }): Task {
  return {
    description: null,
    content_type: "text",
    status: "offen",
    priority: "mittel",
    assigned_to: null,
    assigned_user_id: null,
    created_by: null,
    due_date: null,
    job_id: null,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    ...over,
  } as Task;
}

function posten(over: Partial<OffenerPosten> & { id: string }): OffenerPosten {
  return {
    nummer: null,
    titel: "Rechnung",
    kunde: null,
    faelligAm: null,
    restbetrag: 0,
    ueberfaellig: false,
    ...over,
  };
}

function anmietung(over: Partial<Subrental> & { id: string }): Subrental {
  return {
    job_id: "job-1",
    supplier_id: "sup-1",
    status: "entwurf",
    start_date: "2026-08-20",
    end_date: "2026-08-22",
    logistics: "abholung",
    order_number: null,
    notes: null,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    ...over,
  } as Subrental;
}

function anfrage(over: Partial<WebsiteLead> & { id: string; name: string }): WebsiteLead {
  return {
    email: null,
    phone: null,
    company: null,
    event_date: null,
    event_type: null,
    message: null,
    status: "neu",
    created_at: "2026-08-05T00:00:00Z",
    ...over,
  } as WebsiteLead;
}

const LEER = {
  ueberfaelligeAufgaben: [] as Task[],
  offenePosten: [] as OffenerPosten[],
  anmietungen: [] as Subrental[],
  neueAnfragen: [] as WebsiteLead[],
  heute: HEUTE,
};

describe("faelligkeitsText", () => {
  it("benennt Vergangenheit, Gegenwart und Zukunft", () => {
    expect(faelligkeitsText(-4)).toBe("seit 4 Tagen");
    expect(faelligkeitsText(-1)).toBe("seit gestern");
    expect(faelligkeitsText(0)).toBe("heute");
    expect(faelligkeitsText(1)).toBe("morgen");
    expect(faelligkeitsText(9)).toBe("in 9 Tagen");
  });
});

describe("buildActionItems", () => {
  it("liefert bei nichts zu tun eine leere Liste", () => {
    expect(buildActionItems(LEER)).toEqual([]);
  });

  it("stellt Überfälliges immer vor Offenes", () => {
    const items = buildActionItems({
      ...LEER,
      neueAnfragen: [anfrage({ id: "l1", name: "Anfrage Meier" })],
      ueberfaelligeAufgaben: [task({ id: "t1", title: "Kabel prüfen", due_date: "2026-08-05" })],
    });
    expect(items.map((i) => i.kind)).toEqual(["aufgabe", "anfrage"]);
    expect(items[0].urgency).toBe("ueberfaellig");
    expect(items[1].urgency).toBe("offen");
  });

  it("sortiert Überfälliges nach der ältesten gerissenen Frist", () => {
    const items = buildActionItems({
      ...LEER,
      ueberfaelligeAufgaben: [
        task({ id: "neu", title: "Gestern", due_date: "2026-08-06" }),
        task({ id: "alt", title: "Vor einer Woche", due_date: "2026-07-31" }),
      ],
    });
    expect(items.map((i) => i.title)).toEqual(["Vor einer Woche", "Gestern"]);
    expect(items[0].meta).toBe("seit 7 Tagen");
  });

  it("zählt eine heute fällige Aufgabe noch nicht als überfällig", () => {
    const [item] = buildActionItems({
      ...LEER,
      ueberfaelligeAufgaben: [task({ id: "t1", title: "Heute fällig", due_date: "2026-08-07" })],
    });
    expect(item.urgency).toBe("offen");
    expect(item.meta).toBe("heute");
  });

  it("zeigt bei Rechnungen den offenen Restbetrag und führt zur Rechnungsliste", () => {
    const [item] = buildActionItems({
      ...LEER,
      offenePosten: [
        posten({
          id: "r1",
          nummer: "RE-2026-0007",
          titel: "Sommerfest",
          kunde: "Stadtwerke",
          faelligAm: "2026-07-28",
          restbetrag: 1190,
          ueberfaellig: true,
        }),
      ],
    });
    expect(item.title).toBe("RE-2026-0007");
    expect(item.detail).toBe("Stadtwerke · Sommerfest");
    expect(item.meta).toContain("1.190,00");
    expect(item.to).toBe("/rechnungen");
    expect(item.urgency).toBe("ueberfaellig");
  });

  it("unterscheidet bei Anmietungen Entwurf und Wartestellung und verlinkt den Job", () => {
    const items = buildActionItems({
      ...LEER,
      anmietungen: [
        anmietung({ id: "s1", status: "entwurf", job_id: "job-9" }),
        anmietung({ id: "s2", status: "angefragt", start_date: "2026-08-10" }),
      ],
    });
    const entwurf = items.find((i) => i.id === "anmietung-s1");
    const angefragt = items.find((i) => i.id === "anmietung-s2");
    expect(entwurf?.detail).toBe("Anmietung noch nicht bestellt");
    expect(entwurf?.to).toBe("/jobs/job-9");
    expect(angefragt?.detail).toBe("Anmietung wartet auf Bestätigung");
    // Die frühere Anmietung steht oben.
    expect(items[0].id).toBe("anmietung-s2");
  });

  it("nutzt bei Anfragen ohne Eventdatum den Eingang als Datum", () => {
    const [item] = buildActionItems({
      ...LEER,
      neueAnfragen: [anfrage({ id: "l1", name: "Frau Özdemir", created_at: "2026-08-05T09:00:00Z" })],
    });
    expect(item.meta).toBe("ohne Termin");
    // Eingang 2 Tage her -> sortiert vor einer Anfrage mit Termin in der Zukunft.
    expect(item.sortKey).toBeLessThan(1_000_000);
  });

  it("mischt alle vier Quellen in eine einzige Reihenfolge", () => {
    const items = buildActionItems({
      ueberfaelligeAufgaben: [task({ id: "t1", title: "Angebot nachfassen", due_date: "2026-08-04" })],
      offenePosten: [
        posten({ id: "r1", nummer: "RE-2026-0001", faelligAm: "2026-07-20", restbetrag: 500, ueberfaellig: true }),
      ],
      anmietungen: [anmietung({ id: "s1", start_date: "2026-08-12" })],
      neueAnfragen: [anfrage({ id: "l1", name: "Hochzeit Sander", event_date: "2026-09-01" })],
      heute: HEUTE,
    });
    expect(items.map((i) => i.kind)).toEqual(["rechnung", "aufgabe", "anmietung", "anfrage"]);
    expect(items.filter((i) => i.urgency === "ueberfaellig")).toHaveLength(2);
  });
});
