# Kalender-Feed öffentlich machen (Cloudflare Tunnel)

Damit Google/Apple Kalender den Abo-Feed **von überall** abrufen können, muss er
über eine öffentliche HTTPS-Adresse erreichbar sein. Cloudflare Tunnel macht das
**kostenlos**, ohne Ports im Router zu öffnen. Wir geben dabei **nur** den
Feed-Pfad frei — der Rest von Supabase bleibt privat.

`cloudflared` ist bereits installiert (Version per `cloudflared --version` prüfen,
ggf. Terminal neu starten, damit der Befehl im PATH ist).

## Voraussetzung
- Kostenloses **Cloudflare-Konto**.
- Eine **Domain**, die in Cloudflare eingebunden ist (Nameserver bei Cloudflare).
  Domain hinzufügen: Cloudflare-Dashboard → „Add a site" → Anweisungen folgen
  (Nameserver beim Registrar auf die zwei Cloudflare-Nameserver umstellen).

## Einrichtung (einmalig)

> Beispiel-Hostname unten: `kalender.deine-domain.de` — ersetze ihn durch deinen.

```powershell
# 1) cloudflared mit deinem Cloudflare-Konto verbinden (öffnet den Browser,
#    dort die Domain/Zone auswählen). Legt cert.pem in %USERPROFILE%\.cloudflared an.
cloudflared tunnel login

# 2) Tunnel anlegen (Name frei wählbar). Gibt eine TUNNEL_UUID aus und legt
#    %USERPROFILE%\.cloudflared\<UUID>.json (Credentials) an.
cloudflared tunnel create eventtech

# 3) DNS-Eintrag für den Hostnamen anlegen (zeigt auf den Tunnel).
cloudflared tunnel route dns eventtech kalender.deine-domain.de
```

Dann die Datei `config.example.yml` (aus diesem Ordner) nach
`%USERPROFILE%\.cloudflared\config.yml` kopieren und die Platzhalter füllen:
- `<TUNNEL_UUID>` → die UUID aus Schritt 2
- `<DEIN_USER>` → dein Windows-Benutzername
- `<kalender.deine-domain.de>` → dein Hostname (3×)

## Starten

```powershell
# Testlauf (Vordergrund, Strg+C beendet):
cloudflared tunnel run eventtech

# Dauerhaft als Windows-Dienst (startet mit dem Rechner):
cloudflared service install
```

## In der App aktivieren

In `apps/web/.env` setzen (und Dev-Server neu starten):

```
VITE_CALENDAR_FEED_BASE_URL=https://kalender.deine-domain.de
```

Danach baut der Abo-Link in der App automatisch die öffentliche Adresse, und die
Warnung „nur im lokalen Netzwerk" verschwindet. Der Rest der App nutzt weiter die
schnelle LAN-IP.

## Testen

```powershell
# Sollte das .ics liefern (Token aus dem Abo-Dialog der App):
curl "https://kalender.deine-domain.de/functions/v1/calendar-feed?token=<DEIN_TOKEN>"

# Sollte 404 sein (nichts anderes ist öffentlich):
curl -i "https://kalender.deine-domain.de/rest/v1/devices"
```

## Sicherheit
- Es ist **nur** `/functions/v1/calendar-feed` öffentlich; alle anderen Pfade → 404.
- Der Feed ist read-only und durch den geheimen Token geschützt (wie Googles
  „geheime iCal-Adresse"). Bei Verdacht im Abo-Dialog „Neuen Link erzeugen".
