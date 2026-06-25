-- EventTech Manager — Defekt-Menge für „abgeleitete Verfügbarkeit"
-- Statt eines binären Status auf Mengen-Geräten wird Verfügbarkeit berechnet:
--   verfügbar = stock_quantity − defective_quantity − aktuell_ausgegeben(aktive Jobs)
-- defective_quantity hält fest, wie viele Einheiten dauerhaft defekt sind
-- (z.B. „2 von 5 Kabeln kaputt"). „aktuell ausgegeben" ergibt sich aus den
-- Packlisten aktiver Jobs und wird client-seitig berechnet.

alter table devices
  add column defective_quantity integer not null default 0
    constraint chk_devices_defective
    check (defective_quantity >= 0 and defective_quantity <= stock_quantity);
