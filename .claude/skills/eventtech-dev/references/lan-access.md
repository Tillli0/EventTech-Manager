# Zugriff im lokalen Netz (WLAN) einrichten

Ziel: Andere Geräte (Handy, Tablet, zweiter Rechner) im selben WLAN sollen die App
erreichen — nicht nur `localhost` auf dem Entwicklungsrechner.

## 1. LAN-IP des Rechners ermitteln

```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like "192.168.*" } |
  Select-Object InterfaceAlias, IPAddress
```

Die WLAN-Adresse nehmen (z. B. `192.168.2.69`). Achtung: per DHCP vergeben — kann sich
nach Neustart ändern. Für dauerhaften Betrieb im Router eine feste IP/DHCP-Reservierung
einrichten.

## 2. `.env` auf die LAN-IP zeigen lassen

In `apps/web/.env`:

```
VITE_SUPABASE_URL=http://<LAN-IP>:54321
VITE_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
```

Wichtig, **warum**: Der Browser auf dem Handy führt das JS aus und ruft Supabase vom
**Client-Gerät** auf — `127.0.0.1` würde dort auf das Handy selbst zeigen. Daher muss die
URL die LAN-IP des Servers sein.

## 3. Firewall öffnen (als Administrator)

Eine **PowerShell als Administrator** öffnen und TCP 5173 (Vite) + 54321 (Supabase) im
privaten Netzprofil freigeben:

```powershell
New-NetFirewallRule -DisplayName "EventTech Vite 5173" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173 -Profile Private
New-NetFirewallRule -DisplayName "EventTech Supabase 54321" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 54321 -Profile Private
```

(Scheitert mit „Zugriff verweigert", wenn die PowerShell **nicht** als Admin läuft.)

## 4. Dev-Server neu starten und testen

`.env`-Änderungen greifen erst nach Neustart von `npm run dev`. Vite zeigt dann eine
„Network"-URL. Auf dem anderen Gerät im Browser: `http://<LAN-IP>:5173`.

Supabase (Kong) bindet bereits an `0.0.0.0:54321`, braucht also keinen Neustart für den
LAN-Zugriff — nur die Firewall-Freigabe.

## Wichtiger Hinweis: Kamera-Scannen im WLAN

Browser erlauben den **Kamerazugriff** (Barcode-Scannen) nur über `https` oder
`localhost`. Über `http://<LAN-IP>:5173` funktioniert das Kamera-Scannen auf dem Handy
**nicht** — der USB-Scanner (Tastatur-Eingabe) und alles andere schon. Für Kamera-Scannen
im WLAN bräuchte es HTTPS (z. B. via Caddy/mkcert mit selbstsigniertem Zertifikat).
