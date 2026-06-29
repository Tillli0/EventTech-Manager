# Ideen & Weiterentwicklung — EventTech-Manager

> **Wie das hier funktioniert:** Beginnt eine Nachricht an Claude mit **`+`**, schaltet
> der „Weiterentwicklungs-Modus" ein (siehe `CLAUDE.md`). Claude setzt dann **kleine,
> risikoarme** Verbesserungen selbst um (verifiziert, committet, gepusht), **schlägt
> Größeres erst vor**, pflegt diese Datei und **berichtet jedes Mal**, was passiert ist.
>
> Legende — **Aufwand** S/M/L · **Wirkung** ★–★★★ · **Auto** = Claude darf eigenständig
> umsetzen (klein/risikoarm) / **Freigabe** = vorher fragen.

## 🔧 Quick Wins (Auto — kann Claude eigenständig erledigen)

- [ ] **ESLint-Warnung beheben** in `apps/web/src/hooks/useJobs.ts` (ungenutztes `jobId`). · S · ★ · Auto
- [ ] **Globaler „neue Anfragen"-Badge** in der Navigation/Sidebar (nicht nur am Kunden-Tab),
      damit man neue Website-Leads überall sieht. · S · ★★ · Auto
- [ ] **„Verworfen rückgängig"** im Website-Anfragen-Tab (verworfenen Lead wieder auf „neu"). · S · ★ · Auto
- [ ] **Leere-Zustände/Ladezustände** vereinheitlichen, wo noch nicht (Konsistenz-Pass). · S · ★ · Auto

## 🚀 Größere Features (Freigabe nötig — Claude schlägt vor)

- [ ] **Rechnungsstellung** — größter offener Baustein: Rechnung aus Job/Angebot, Status-Workflow
      (offen/bezahlt/überfällig), PDF. Dashboard verweist bereits darauf. · L · ★★★ · Freigabe
- [ ] **Globale Suche + Änderungsprotokoll** — projektweite Suche (Geräte/Jobs/Kunden/Angebote)
      und ein Audit-Log, wer wann was geändert hat. · L · ★★★ · Freigabe
- [ ] **Automatisierte Tests** — zumindest Smoke-Tests (Login, Packliste, Angebot, Lead-Annahme);
      aktuell keinerlei Tests. · M · ★★ · Freigabe
- [ ] **DB-Backups** der Cloud-DB (regelmäßiger `pg_dump`, z.B. via GitHub-Action). · M · ★★ · Freigabe
- [ ] **Spam: Cloudflare-Turnstile-Captcha** zusätzlich zu Honeypot + Rate-Limit, falls Spam durchkommt. · M · ★ · Freigabe
- [ ] **Performance: Code-Splitting** — große Chunks aufteilen (`react-pdf` ~1,3 MB, `DeviceDetailPage`
      ~0,98 MB lazy-laden), schnellerer Erststart. · M · ★★ · Freigabe

## 💡 Kleinere Verbesserungen / Backlog

- [ ] **Kalender-Feed-Abo-Link** prüfen/aktivieren (`calendar-feed` existiert, Cloud-URL nutzbar;
      `VITE_CALENDAR_FEED_BASE_URL`). · S · ★★ · Freigabe
- [ ] **Lead-Notizen** — interne Notiz pro Website-Anfrage vor dem Konvertieren. · S · ★ · Freigabe
- [ ] **Dubletten-Check auch bei manueller Kundenanlage** (nicht nur bei Lead-Konvertierung). · S · ★★ · Freigabe

## ✅ Kürzlich umgesetzt (Verlauf)

- Website-Kontaktformular → System: Tabelle `website_leads`, öffentliche Edge Function `public-lead`,
  Tab „Website-Anfragen" (Filter + Zähler), „Zu Kunde/Job machen" mit Dubletten-Erkennung,
  Spam-Härtung (Honeypot + IP-Rate-Limit), optionale E-Mail-Benachrichtigung (Resend, Zieladresse
  in den Firmendaten). Migrationen 0031–0033.
