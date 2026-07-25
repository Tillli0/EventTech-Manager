-- 0046: Kategorie an Anmiet-Positionen (Block B / E2b-Erweiterung).
--
-- Freitext-Positionen einer Anmietung (subrental_items ohne device_id) hatten bisher
-- keine Kategorie und konnten deshalb nicht wie die eigene Packliste nach Kategorie
-- sortiert/gruppiert werden (Tills Wunsch: "Technikangebot so sortiert wie in der
-- Software"). Verweist auf dieselbe `categories`-Tabelle wie `devices` — keine
-- separate Kategorie-Liste. Das Gerät/die Position selbst bleibt weiterhin temporär
-- (kein neuer Eintrag in `devices`), nur die Kategorie kann dauerhaft neu entstehen
-- (Frontend-Logik, s. PLAN-NEUAUSRICHTUNG.md).

alter table subrental_items
  add column category_id uuid references categories(id) on delete set null;

create index idx_subrental_items_category on subrental_items(category_id);

notify pgrst, 'reload schema';
