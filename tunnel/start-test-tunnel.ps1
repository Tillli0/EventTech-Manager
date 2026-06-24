# Startet den temporären Test-Tunnel für den Kalender-Feed — und trägt die
# öffentliche Adresse AUTOMATISCH in apps\web\.env ein.
#
# Bedienung:
#   Rechtsklick auf diese Datei -> "Mit PowerShell ausführen"
#   ODER im Terminal:  powershell -ExecutionPolicy Bypass -File tunnel\start-test-tunnel.ps1
#
# Danach nur noch: App im Browser neu laden (Strg+F5). Fertig.
# Fenster offen lassen, solange du den Link nutzen willst. Strg+C beendet alles.
#
# Hinweis: Die URL ändert sich bei JEDEM Start. Nur zum Testen gedacht.

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)   # Projekt-Hauptverzeichnis
$envFile = Join-Path (Get-Location) "apps\web\.env"

# cloudflared finden
$cf = (Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter cloudflared.exe -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
if (-not $cf) { Write-Host "cloudflared nicht gefunden. Installieren: winget install Cloudflare.cloudflared" -ForegroundColor Red; exit 1 }

# 1) Mini-Proxy starten (gibt nur den Feed-Pfad frei)
$proxy = Start-Process node -ArgumentList "tunnel/feed-proxy.mjs" -PassThru -WindowStyle Hidden
Write-Host "Feed-Proxy gestartet (PID $($proxy.Id)) auf Port 8788." -ForegroundColor Green

# 2) cloudflared starten, Ausgabe in Logdatei
$log = Join-Path $env:TEMP "eventtech-tunnel.log"
$errLog = "$log.err"
Remove-Item $log, $errLog -Force -ErrorAction SilentlyContinue
$tunnel = Start-Process $cf -ArgumentList "tunnel --url http://localhost:8788 --no-autoupdate" -PassThru -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError $errLog

# 3) Auf die öffentliche URL warten
Write-Host "Warte auf öffentliche Adresse ..." -ForegroundColor Cyan
$url = $null
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Milliseconds 700
  $content = (Get-Content $log, $errLog -ErrorAction SilentlyContinue) -join "`n"
  $m = [regex]::Match($content, "https://[a-z0-9-]+\.trycloudflare\.com")
  if ($m.Success) { $url = $m.Value; break }
}
if (-not $url) {
  Write-Host "Keine URL erhalten. Abbruch." -ForegroundColor Red
  Stop-Process -Id $proxy.Id, $tunnel.Id -Force -ErrorAction SilentlyContinue
  exit 1
}

# 4) .env automatisch aktualisieren (nur die aktive Zeile; UTF-8 ohne BOM)
$text = [System.IO.File]::ReadAllText($envFile)
$line = "VITE_CALENDAR_FEED_BASE_URL=$url"
if ([regex]::IsMatch($text, "(?m)^VITE_CALENDAR_FEED_BASE_URL=.*$")) {
  $text = [regex]::Replace($text, "(?m)^VITE_CALENDAR_FEED_BASE_URL=.*$", $line)
} else {
  $text = $text.TrimEnd() + "`r`n$line`r`n"
}
[System.IO.File]::WriteAllText($envFile, $text, (New-Object System.Text.UTF8Encoding $false))

Write-Host ""
Write-Host "FERTIG - öffentliche Adresse aktiv:" -ForegroundColor Green
Write-Host "  $url" -ForegroundColor Yellow
Write-Host ".env wurde aktualisiert  ->  App jetzt im Browser neu laden (Strg+F5)." -ForegroundColor Green
Write-Host "Dieses Fenster OFFEN lassen. Strg+C beendet Tunnel + Proxy." -ForegroundColor Cyan

# 5) Laufen lassen bis Strg+C / Fenster geschlossen
try {
  Wait-Process -Id $tunnel.Id
}
finally {
  Stop-Process -Id $proxy.Id, $tunnel.Id -Force -ErrorAction SilentlyContinue
  Write-Host "Tunnel und Proxy gestoppt." -ForegroundColor Green
}
