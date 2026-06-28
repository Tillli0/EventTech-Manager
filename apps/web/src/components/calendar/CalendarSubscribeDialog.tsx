import { useState } from "react";
import { Copy, Check, RefreshCw, Calendar as CalendarIcon, Apple, AlertTriangle } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/States";
import { useCalendarFeedToken, useRegenerateCalendarFeed, calendarFeedUrl } from "@/hooks/useCalendarFeed";
import { useConfirm } from "@/components/ui/ConfirmDialog";

/** Erkennt lokale/LAN-Adressen, die aus dem Internet (z. B. von Googles Servern)
 * nicht erreichbar sind — dann kann ein Online-Abo nicht funktionieren. */
function isPrivateUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const h = u.hostname;
    return (
      h === "localhost" ||
      h.endsWith(".local") ||
      /^127\./.test(h) ||
      /^10\./.test(h) ||
      /^192\.168\./.test(h) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)
    );
  } catch {
    return false;
  }
}

/**
 * Zeigt den persönlichen Abo-Link, mit dem der interne Kalender einseitig in
 * Google / Apple Kalender abonniert werden kann (read-only). Der Link enthält
 * einen geheimen Token — wer ihn hat, sieht den Kalender. Darum: nicht teilen,
 * und bei Verdacht neu erzeugen.
 */
export function CalendarSubscribeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: token, isLoading } = useCalendarFeedToken();
  const regenerate = useRegenerateCalendarFeed();
  const confirm = useConfirm();
  const [copied, setCopied] = useState(false);

  const url = token ? calendarFeedUrl(token) : "";
  // Google bietet einen Direkt-Link zum "Per URL hinzufügen"-Dialog.
  const googleAddUrl = url
    ? `https://calendar.google.com/calendar/r/settings/addbyurl?cid=${encodeURIComponent(url)}`
    : "";
  // webcal:// lässt Apple Kalender direkt das Abo-Fenster öffnen.
  const webcalUrl = url.replace(/^https?:\/\//, "webcal://");

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard kann blockiert sein (z. B. ohne HTTPS) — dann wählt der Nutzer manuell aus.
    }
  }

  async function handleRegenerate() {
    const ok = await confirm({
      title: "Neuen Abo-Link erzeugen?",
      message:
        "Bestehende Abos hören dann auf zu aktualisieren, bis du den neuen Link einträgst.",
      confirmLabel: "Neu erzeugen",
      danger: true,
    });
    if (!ok) return;
    await regenerate.mutateAsync();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Kalender abonnieren">
      {isLoading ? (
        <LoadingState label="Abo-Link wird geladen …" />
      ) : (
        <div className="space-y-5">
          <p className="text-sm text-ink-muted">
            Abonniere deinen Arbeitskalender in Google oder Apple Kalender. Termine und Job-Zeitpläne
            erscheinen dann automatisch in deinem privaten Kalender und aktualisieren sich von selbst
            (einseitig, read-only). Gelöschtes verschwindet, sobald dein Kalender neu lädt.
          </p>

          {isPrivateUrl(url) && (
            <div className="flex gap-2 rounded-lg border border-status-wartung/40 bg-status-wartung-bg px-3 py-2.5 text-xs text-ink">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-status-wartung" />
              <div className="space-y-1">
                <p className="font-medium text-status-wartung">Nur im lokalen Netzwerk erreichbar</p>
                <p className="text-ink-muted">
                  Dieser Link zeigt auf eine lokale Adresse ({new URL(url).host}). <span className="font-medium text-ink">Google
                  Calendar kann ihn nicht abrufen</span>, weil Googles Server diese Adresse aus dem Internet nicht
                  erreichen. <span className="font-medium text-ink">Apple Kalender</span> funktioniert nur auf Geräten im
                  <span className="font-medium text-ink"> selben WLAN</span>.
                </p>
                <p className="text-ink-muted">
                  Für echtes Online-Abo (Google, überall) muss der Server über eine öffentliche Adresse erreichbar sein
                  (z. B. per Tunnel/Domain). Sag Bescheid, dann richte ich das ein.
                </p>
              </div>
            </div>
          )}

          {/* Abo-Link */}
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Dein persönlicher Abo-Link</label>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={url}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 truncate rounded-md border border-border bg-bg-raised px-3 py-2 font-mono text-xs text-ink"
              />
              <Button size="sm" variant="secondary" onClick={copy}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Kopiert" : "Kopieren"}
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-ink-faint">
              Geheim halten — wer diesen Link hat, kann deinen Kalender lesen.
            </p>
          </div>

          {/* Schnell-Buttons */}
          <div className="grid gap-2 sm:grid-cols-2">
            <a href={googleAddUrl} target="_blank" rel="noopener noreferrer" className="contents">
              <Button variant="secondary" className="w-full justify-start" disabled={!url}>
                <CalendarIcon size={16} />
                In Google Kalender öffnen
              </Button>
            </a>
            <a href={webcalUrl} className="contents">
              <Button variant="secondary" className="w-full justify-start" disabled={!url}>
                <Apple size={16} />
                In Apple Kalender öffnen
              </Button>
            </a>
          </div>

          {/* Anleitung */}
          <div className="rounded-lg border border-border bg-bg-raised p-3 text-xs text-ink-muted">
            <p className="mb-1 font-medium text-ink">Manuell einrichten</p>
            <p className="mb-1">
              <span className="font-medium text-ink">Google:</span> Anderer Kalender → „Per URL hinzufügen" → Link einfügen.
            </p>
            <p>
              <span className="font-medium text-ink">Apple (iPhone/Mac):</span> Kalender → „Kalender hinzufügen" →
              „Kalenderabonnement hinzufügen" → Link einfügen.
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <Button variant="ghost" size="sm" onClick={handleRegenerate} disabled={regenerate.isPending}>
              <RefreshCw size={14} className={regenerate.isPending ? "animate-spin" : ""} />
              Neuen Link erzeugen
            </Button>
            <Button variant="secondary" onClick={onClose}>Schließen</Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
