import { useState, useEffect, useRef, useCallback } from "react";
import { useZxing } from "react-zxing";
import { CameraOff, SwitchCamera } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Kamera-basierter Barcode-Scanner für Mobilgeräte.
 * USB-Scanner am PC senden Tastatureingaben + Enter ("Keyboard Wedge") —
 * dafür gibt es separat useUsbScannerInput weiter unten in dieser Datei.
 */
export function CameraBarcodeScanner({
  onResult,
  paused = false,
}: {
  onResult: (code: string) => void;
  paused?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  // Aktiv gewählte Kamera. Leer = Standard (Rückkamera über facingMode).
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);

  // Verfügbare Kameras ermitteln. DeviceIDs sind erst nach erteilter
  // Kamerafreigabe gefüllt — daher zusätzlich beim Start des Videos neu laden.
  const loadCameras = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setCameras(all.filter((d) => d.kind === "videoinput"));
    } catch {
      /* enumerateDevices kann ohne Berechtigung fehlschlagen — ignorieren */
    }
  }, []);

  useEffect(() => {
    loadCameras();
    navigator.mediaDevices?.addEventListener?.("devicechange", loadCameras);
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", loadCameras);
  }, [loadCameras]);

  const { ref } = useZxing({
    onDecodeResult(result) {
      onResult(result.getText());
    },
    onError(err) {
      setError(err instanceof Error ? err.message : "Kamera konnte nicht gestartet werden.");
    },
    paused,
    deviceId,
    constraints: {
      video: { facingMode: "environment" },
    },
  });

  const selectableIds = cameras.map((c) => c.deviceId).filter(Boolean);
  const canSwitch = selectableIds.length >= 2;

  function switchCamera() {
    if (!canSwitch) return;
    const current = deviceId ? selectableIds.indexOf(deviceId) : 0;
    setDeviceId(selectableIds[(current + 1) % selectableIds.length]);
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-bg-raised px-6 py-12 text-center">
        <CameraOff size={28} className="text-ink-faint" />
        <p className="text-sm text-ink-muted">Kein Kamerazugriff möglich.</p>
        <p className="text-xs text-ink-faint">{error}</p>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-lg border border-border bg-black")}>
      <video
        ref={ref as React.RefObject<HTMLVideoElement>}
        onLoadedMetadata={loadCameras}
        className="aspect-video w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-1/3 w-2/3 rounded-md border-2 border-accent/70" />
      </div>
      {canSwitch && (
        <button
          type="button"
          onClick={switchCamera}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-2 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-black/70"
          aria-label="Kamera wechseln"
        >
          <SwitchCamera size={16} />
          Kamera
        </button>
      )}
    </div>
  );
}

/**
 * Hook für USB-Barcode-Scanner am PC.
 * Diese Geräte funktionieren als "Keyboard Wedge": sie tippen den gescannten
 * Code zeichenweise sehr schnell (typisch < 30ms zwischen Zeichen) und
 * schließen mit Enter ab. Wir unterscheiden das von normaler Tastatureingabe
 * über die Zeitspanne zwischen den Tastenanschlägen.
 */
export function useUsbScannerInput(onScan: (code: string) => void, enabled = true) {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) return;

    let buffer = "";
    let lastKeyTime = 0;
    const FAST_INPUT_THRESHOLD_MS = 50;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isFormField =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      const now = Date.now();
      const elapsed = now - lastKeyTime;
      lastKeyTime = now;

      if (elapsed > FAST_INPUT_THRESHOLD_MS) {
        buffer = "";
      }

      if (e.key === "Enter") {
        if (buffer.length >= 4 && !isFormField) {
          onScanRef.current(buffer);
        }
        buffer = "";
        return;
      }

      if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled]);
}
