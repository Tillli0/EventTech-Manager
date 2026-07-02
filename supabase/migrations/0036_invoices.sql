-- 0036: Rechnungswesen — Rechnungen mit lückenloser Nummerierung, Positionen
-- (Snapshot wie bei Angeboten) und Teilzahlungen.
--
-- Design-Entscheidungen:
-- * Entwürfe haben KEINE Rechnungsnummer. Die Nummer wird erst beim „Stellen"
--   vergeben (Funktion issue_invoice) — lückenlos pro Jahr (RE-2026-0001, …),
--   unter Parallelzugriff abgesichert per pg_advisory_xact_lock (GoBD).
-- * „teilbezahlt/bezahlt/überfällig" sind KEINE gespeicherten Status, sondern
--   werden client-seitig aus Zahlungen + Fälligkeitsdatum abgeleitet — kein
--   Cron nötig, keine Inkonsistenz. Gespeichert: entwurf/gestellt/storniert.
-- * Gestellte Rechnungen können nicht gelöscht und ihre Nummer nicht geändert
--   werden (Trigger) — Korrekturen laufen über Storno (Status storniert).
-- * Rechte: Rechnungen gehören zum Bereich „angebote" (kaufmännischer Bereich),
--   RLS nach dem Muster aus 0012.

create type invoice_status as enum ('entwurf', 'gestellt', 'storniert');

create table invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique,                     -- null = Entwurf; vergeben beim Stellen
  customer_id uuid references customers(id) on delete set null,
  job_id uuid references jobs(id) on delete set null,
  offer_id uuid references offers(id) on delete set null,
  title text not null,
  status invoice_status not null default 'entwurf',
  invoice_date date,                              -- Rechnungsdatum (gesetzt beim Stellen)
  due_date date,                                  -- Zahlungsziel
  service_date date,                              -- Leistungs-/Eventdatum (§14-Angabe)
  tax_rate numeric not null default 19
    constraint chk_invoices_tax_rate_nonneg check (tax_rate >= 0),
  -- Snapshot der Kundenadresse zum Zeitpunkt des Stellens (bleibt stabil,
  -- auch wenn der Kunde später umzieht/gelöscht wird).
  address_snapshot text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_invoices_updated_at
  before update on invoices
  for each row execute function set_updated_at();

create index idx_invoices_customer on invoices(customer_id);
create index idx_invoices_job on invoices(job_id);
create index idx_invoices_offer on invoices(offer_id);

create table invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  device_id uuid references devices(id) on delete set null,
  description text not null,                      -- Snapshot der Bezeichnung
  quantity integer not null default 1
    constraint chk_invoice_items_quantity_positive check (quantity > 0),
  rental_days integer not null default 1
    constraint chk_invoice_items_rental_days_positive check (rental_days > 0),
  unit_price numeric not null default 0
    constraint chk_invoice_items_unit_price_nonneg check (unit_price >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_invoice_items_invoice on invoice_items(invoice_id);

create table invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  amount numeric not null
    constraint chk_invoice_payments_amount_positive check (amount > 0),
  paid_at date not null default current_date,
  method text,                                    -- z.B. Überweisung, bar
  note text,
  created_at timestamptz not null default now()
);

create index idx_invoice_payments_invoice on invoice_payments(invoice_id);

-- ============================================================
-- Lückenlose Nummernvergabe beim Stellen
-- ============================================================

-- Vergibt die nächste Rechnungsnummer des laufenden Jahres und setzt den Status
-- auf 'gestellt'. Der Advisory-Lock serialisiert parallele Aufrufe, damit die
-- Nummernfolge garantiert lückenlos und kollisionfrei bleibt (max()+1 wäre
-- sonst unter Nebenläufigkeit doppelt vergebbar). SECURITY INVOKER: RLS und
-- GRANTs des Aufrufers gelten unverändert.
create function issue_invoice(p_invoice_id uuid) returns invoices
language plpgsql
as $$
declare
  v invoices;
  n integer;
  yr text := to_char(current_date, 'YYYY');
begin
  perform pg_advisory_xact_lock(hashtext('invoice_number_' || yr));

  select * into v from invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'Rechnung nicht gefunden.';
  end if;
  if v.status = 'storniert' then
    raise exception 'Stornierte Rechnungen können nicht gestellt werden.';
  end if;
  if v.invoice_number is not null then
    return v; -- bereits gestellt: idempotent
  end if;

  select coalesce(max(substring(invoice_number from '\d+$')::integer), 0) + 1
    into n
    from invoices
   where invoice_number like 'RE-' || yr || '-%';

  update invoices
     set invoice_number = format('RE-%s-%s', yr, lpad(n::text, 4, '0')),
         status = 'gestellt',
         invoice_date = coalesce(invoice_date, current_date)
   where id = p_invoice_id
   returning * into v;

  return v;
end;
$$;

grant execute on function issue_invoice(uuid) to authenticated, service_role;

-- ============================================================
-- Schutz gestellter Rechnungen (GoBD: nicht löschen, Nummer unveränderlich)
-- ============================================================

create function protect_issued_invoice() returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if old.invoice_number is not null then
      raise exception 'Gestellte Rechnungen können nicht gelöscht werden — bitte stornieren.';
    end if;
    return old;
  end if;
  -- UPDATE: einmal vergebene Nummer ist unveränderlich.
  if old.invoice_number is not null
     and new.invoice_number is distinct from old.invoice_number then
    raise exception 'Die Rechnungsnummer kann nicht geändert werden.';
  end if;
  return new;
end;
$$;

create trigger trg_invoices_protect
  before update or delete on invoices
  for each row execute function protect_issued_invoice();

-- ============================================================
-- RLS (Bereich „angebote") + GRANTs
-- ============================================================

alter table invoices enable row level security;
create policy invoices_sel on invoices for select using (has_area('angebote'));
create policy invoices_ins on invoices for insert with check (can_edit_area('angebote'));
create policy invoices_upd on invoices for update using (can_edit_area('angebote')) with check (can_edit_area('angebote'));
create policy invoices_del on invoices for delete using (can_edit_area('angebote'));

alter table invoice_items enable row level security;
create policy invoice_items_sel on invoice_items for select using (has_area('angebote'));
create policy invoice_items_ins on invoice_items for insert with check (can_edit_area('angebote'));
create policy invoice_items_upd on invoice_items for update using (can_edit_area('angebote')) with check (can_edit_area('angebote'));
create policy invoice_items_del on invoice_items for delete using (can_edit_area('angebote'));

alter table invoice_payments enable row level security;
create policy invoice_payments_sel on invoice_payments for select using (has_area('angebote'));
create policy invoice_payments_ins on invoice_payments for insert with check (can_edit_area('angebote'));
create policy invoice_payments_upd on invoice_payments for update using (can_edit_area('angebote')) with check (can_edit_area('angebote'));
create policy invoice_payments_del on invoice_payments for delete using (can_edit_area('angebote'));

-- Kein Auto-Expose: explizite GRANTs (anon bekommt nichts, siehe 0030).
grant select, insert, update, delete on invoices to authenticated;
grant select, insert, update, delete on invoice_items to authenticated;
grant select, insert, update, delete on invoice_payments to authenticated;
grant all on invoices to service_role;
grant all on invoice_items to service_role;
grant all on invoice_payments to service_role;

notify pgrst, 'reload schema';
