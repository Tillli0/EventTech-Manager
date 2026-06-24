# Startet den temporären Test-Tunnel für den Kalender-Feed.
#
# Was es macht:
#  1) startet den Mini-Proxy (gibt NUR den Feed-Pfad frei, Rest -> 404)
#  2) startet einen Cloudflare-Quick-Tunnel darauf
#  3) zeigt die öffentliche https://....trycloudflare.com-Adresse an
#
# Bedienung:
#   - Rechtsklick auf diese Datei -> "Mit PowerShell ausführen"
#     ODER im Terminal:  powershell -ExecutionPolicy Bypass -File tunnel\start-test-tunnel.ps1
#   - Die angezeigte URL kopieren und in apps\web\.env bei VITE_CALENDAR_FEED_BASE_URL eintragen.
#   - Fenster offen lassen, solange du den Link nutzen willst. Strg+C beendet alles.
#
# Hinweis: Die URL ändert sich bei JEDEM Start. Nur zum Testen.

$ErrorActionPreference = "Stop"

# Ins Projekt-Hauptverzeichnis wechseln (Elternordner dieses Skripts)
Set-Location (Split-Path $PSScriptRoot -Parent)

# cloudflared finden
$cf = (Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter cloudflared.exe -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
if (-not $cf) { Write-Host "cloudflared nicht gefunden. Bitte installieren: winget install Cloudflare.cloudflared" -ForegroundColor Red; exit 1 }

# Mini-Proxy starten (versteckt)
$proxy = Start-Process node -ArgumentList "tunnel/feed-proxy.mjs" -PassThru -WindowStyle Hidden
Write-Host "Feed-Proxy gestartet (PID $($proxy.Id)) auf Port 8788." -ForegroundColor Green
Write-Host ""
Write-Host "Starte Cloudflare-Tunnel ... gleich erscheint unten ein Kasten mit der URL:" -ForegroundColor Cyan
Write-Host "  https://<zufall>.trycloudflare.com   <-- diese Adresse kopieren" -ForegroundColor Yellow
Write-Host ""

try {
  & $cf tunnel --url http://localhost:8788 --no-autoupdate
}
finally {
  # Beim Beenden (Strg+C) den Proxy mit aufräumen
  Stop-Process -Id $proxy.Id -Force -ErrorAction SilentlyContinue
  Write-Host "Tunnel und Proxy gestoppt." -ForegroundColor Green
}
