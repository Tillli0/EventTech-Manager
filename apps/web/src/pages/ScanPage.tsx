import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScanLine } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { CameraBarcodeScanner } from "@/components/barcode/BarcodeScanner";
import { DeviceStatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import type { Device } from "@/types/database";

export function ScanPage() {
  const navigate = useNavigate();
  const [foundDevice, setFoundDevice] = useState<Device | null>(null);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);

  async function handleScanResult(code: string) {
    if (paused) return;
    setPaused(true);
    setNotFoundCode(null);

    const { data: barcode } = await supabase
      .from("barcodes")
      .select("device_id")
      .eq("code", code)
      .maybeSingle();

    if (!barcode) {
      setNotFoundCode(code);
      setTimeout(() => setPaused(false), 1500);
      return;
    }

    const { data: device } = await supabase
      .from("devices")
      .select("*, category:categories(*), barcodes(*)")
      .eq("id", barcode.device_id)
      .single();

    setFoundDevice(device as Device);
  }

  function reset() {
    setFoundDevice(null);
    setNotFoundCode(null);
    setPaused(false);
  }

  return (
    <div>
      <PageHeader title="Barcode scannen" description="Kamera auf den Code richten." />

      {!foundDevice && (
        <Card className="overflow-hidden">
          <CameraBarcodeScanner onResult={handleScanResult} paused={paused} />
        </Card>
      )}

      {notFoundCode && (
        <div className="mt-4 flex items-center justify-between rounded-md bg-status-defekt-bg px-4 py-3 text-sm text-status-defekt">
          <span>
            Kein Gerät mit Code <span className="font-mono">{notFoundCode}</span> gefunden.
          </span>
        </div>
      )}

      {foundDevice && (
        <Card className="mt-4">
          <CardBody className="flex flex-col items-center gap-3 py-8 text-center">
            <ScanLine size={28} className="text-accent" />
            <p className="text-lg font-semibold text-ink">{foundDevice.name}</p>
            <p className="font-mono text-xs text-ink-faint">{foundDevice.barcodes?.[0]?.code}</p>
            {foundDevice.stock_quantity > 1 && (
              <p className="text-xs text-ink-muted">Bestand: {foundDevice.stock_quantity} Stück</p>
            )}
            <DeviceStatusBadge status={foundDevice.status} />
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" onClick={reset}>
                Erneut scannen
              </Button>
              <Button onClick={() => navigate(`/inventar/${foundDevice.id}`)}>Gerät öffnen</Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
