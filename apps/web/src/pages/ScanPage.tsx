import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { CameraBarcodeScanner } from "@/components/barcode/BarcodeScanner";
import { supabase } from "@/lib/supabase";

export function ScanPage() {
  const navigate = useNavigate();
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

    // Direkt zum Gerät springen — kein Zwischenschritt mehr.
    navigate(`/inventar/${barcode.device_id}`);
  }

  return (
    <div>
      <PageHeader title="Barcode scannen" description="Kamera auf den Code richten — das Gerät öffnet sich automatisch." />

      <Card className="overflow-hidden">
        <CameraBarcodeScanner onResult={handleScanResult} paused={paused} />
      </Card>

      {notFoundCode && (
        <div className="mt-4 flex items-center justify-between rounded-md bg-status-defekt-bg px-4 py-3 text-sm text-status-defekt">
          <span>
            Kein Gerät mit Code <span className="font-mono">{notFoundCode}</span> gefunden.
          </span>
        </div>
      )}
    </div>
  );
}
