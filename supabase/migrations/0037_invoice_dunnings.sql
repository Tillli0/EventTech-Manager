-- 0037: Mahnwesen — Versandprotokoll für Zahlungserinnerungen/Mahnungen.
--
-- Design-Entscheidungen:
-- * Drei Stufen: 1 = Zahlungserinnerung, 2 = 1. Mahnung, 3 = 2. und letzte Mahnung.
-- * Jede Stufe kann pro Rechnung nur EINMAL versendet werden (Unique-Constraint) —
--   das schützt auch unter Nebenläufigkeit/Doppelklick vor Doppelversand.
-- * Einträge entstehen ausschließlich serverseitig (Edge Function `send-dunning`,
--   service_role) NACH erfolgreichem E-Mail-Versand. `authenticated` darf nur lesen —
--   so kann niemand per Data-API einen Versand vortäuschen oder den Verlauf ändern.
-- * `to_email`/`subject` sind Snapshots des tatsächlichen Versands (nachvollziehbar,
--   auch wenn der Kunde später seine Adresse ändert).

create table invoice_dunnings (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  level smallint not null
    constraint chk_invoice_dunnings_level check (level between 1 and 3),
  to_email text not null,
  subject text not null,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint uq_invoice_dunnings_invoice_level unique (invoice_id, level)
);

create index idx_invoice_dunnings_invoice on invoice_dunnings(invoice_id);

-- RLS: lesen darf der kaufmännische Bereich (wie Rechnungen); schreiben nur der Server.
alter table invoice_dunnings enable row level security;
create policy invoice_dunnings_sel on invoice_dunnings for select using (has_area('angebote'));

-- Kein Auto-Expose: explizite GRANTs (anon bekommt nichts, siehe 0030).
grant select on invoice_dunnings to authenticated;
grant all on invoice_dunnings to service_role;

notify pgrst, 'reload schema';
