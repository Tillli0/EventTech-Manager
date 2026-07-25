-- 0044: Bestell-Mail an Verleiher — Versandprotokoll (Block B / E5).
--
-- Design-Entscheidungen (Muster invoice_dunnings, 0037):
-- * Einträge entstehen ausschließlich serverseitig (Edge Function
--   `send-subrental-order`, service_role) NACH erfolgreichem E-Mail-Versand.
--   `authenticated` darf nur lesen — so kann niemand per Data-API einen Versand
--   vortäuschen oder den Verlauf ändern.
-- * `sent_to`/`subject`/`body` sind Snapshots des tatsächlichen Versands
--   (nachvollziehbar, auch wenn sich Partner-E-Mail oder Vorgang später ändern).
-- * Anders als bei Mahnstufen gibt es keine Nummernkreis-Beschränkung (ein Vorgang
--   kann mehrfach angeschrieben werden, z.B. Nachfrage) — daher kein Unique-Constraint,
--   nur der Index auf subrental_id für die Verlaufs-Anzeige.

create table subrental_order_emails (
  id uuid primary key default gen_random_uuid(),
  subrental_id uuid not null references subrentals(id) on delete cascade,
  sent_to text not null,
  subject text not null,
  body text not null,
  sent_by uuid references profiles(id) on delete set null,
  sent_at timestamptz not null default now()
);

create index idx_subrental_order_emails_subrental on subrental_order_emails(subrental_id);

-- RLS: lesen darf der Bereich 'anmietung' (wie subrentals); schreiben nur der Server.
alter table subrental_order_emails enable row level security;
create policy subrental_order_emails_sel on subrental_order_emails for select using (has_area('anmietung'));

-- Kein Auto-Expose: explizite GRANTs (anon bekommt nichts, siehe 0030).
grant select on subrental_order_emails to authenticated;
grant all on subrental_order_emails to service_role;

notify pgrst, 'reload schema';
