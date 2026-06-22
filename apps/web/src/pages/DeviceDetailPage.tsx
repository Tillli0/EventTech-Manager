import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Printer, Trash2, Pencil, Check } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DeviceStatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { useDevice, useUpdateDevice, useUpdateDeviceStatus, useDeleteDevice } from "@/hooks/useDevices";
import { DEVICE_STATUS_OPTIONS, type DeviceStatus } from "@/types/database";
import { formatCurrency, formatDate } from "@/lib/format";
import { BarcodeLabel, printBarcodeLabels } from "@/components/barcode/BarcodeLabel";
import { cn } from "@/lib/cn";

export function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: device, isLoading, error } = useDevice(id);
  const updateStatus = useUpdateDeviceStatus();
  const updateDevice = useUpdateDevice();
  const deleteDevice = useDeleteDevice();
  const [editingStock, setEditingStock] = useState(false);
  const [stockInput, setStockInput] = useState("1");

  if (isLoading) return <LoadingState label="Gerät wird geladen …" />;
  if (error) return <ErrorState message={error.message} />;
  if (!device) return <ErrorState message="Gerät nicht gefunden." />;

  const primaryBarcode = device.barcodes?.find((b) => b.is_primary) ?? device.barcodes?.[0];

  async function handleDelete() {
    if (!confirm(`„${device!.name}" wirklich endgültig löschen?`)) return;
    await deleteDevice.mutateAsync(device!.id);
    navigate("/inventar");
  }

  return (
    <div>
      <Link to="/inventar" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft size={14} />
        Zurück zum Inventar
      </Link>

      <PageHeader
        title={device.name}
        description={[device.manufacturer, device.model].filter(Boolean).join(" · ") || undefined}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                primaryBarcode &&
                printBarcodeLabels([{ code: primaryBarcode.code, deviceName: device.name }])
              }
              disabled={!primaryBarcode}
            >
              <Printer size={16} />
              Label drucken
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              <Trash2 size={16} />
            </Button>
          </>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-ink">Status</h2>
            </CardHeader>
            <CardBody>
              {device.stock_quantity > 1 && (
                <p className="mb-3 text-xs text-ink-muted">
                  Mengen-Gerät ({device.stock_quantity} Stück) — der Status hier ist nur ein grober Hinweis
                  (z.B. „defekt“ für den ganzen Posten). Welche Menge gerade ausgeliehen ist, ergibt sich aus
                  den aktiven Jobs, nicht aus diesem Schalter.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {DEVICE_STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateStatus.mutate({ id: device.id, status: opt.value as DeviceStatus })}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                      device.status === opt.value
                        ? "border-accent bg-accent-soft text-ink"
                        : "border-border text-ink-muted hover:border-accent/40 hover:text-ink",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-ink">Stammdaten</h2>
            </CardHeader>
            <CardBody className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-ink-faint">Stückzahl</p>
                {editingStock ? (
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={1}
                      value={stockInput}
                      onChange={(e) => setStockInput(e.target.value)}
                      className="h-8 w-20"
                      autoFocus
                    />
                    <button
                      onClick={async () => {
                        const parsed = Math.max(1, parseInt(stockInput, 10) || 1);
                        await updateDevice.mutateAsync({ id: device.id, stock_quantity: parsed });
                        setEditingStock(false);
                      }}
                      className="rounded p-1 text-accent hover:bg-accent-soft"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setStockInput(String(device.stock_quantity));
                      setEditingStock(true);
                    }}
                    className="mt-0.5 flex items-center gap-1.5 text-ink hover:text-accent"
                  >
                    {device.stock_quantity}
                    {device.stock_quantity > 1 && " Stück"}
                    <Pencil size={11} className="text-ink-faint" />
                  </button>
                )}
              </div>
              <DataField label="Seriennummer" value={device.serial_number} mono />
              <DataField label="Lagerort" value={device.location} />
              <DataField label="Kategorie" value={device.category?.name} />
              <DataField label="Kaufdatum" value={formatDate(device.purchase_date)} />
              <DataField label="Kaufpreis" value={formatCurrency(device.purchase_price)} />
              <DataField label="Wiederbeschaffungswert" value={formatCurrency(device.replacement_value)} />
              <DataField label="Gewicht" value={device.weight_kg ? `${device.weight_kg} kg` : null} />
              <DataField label="Leistung" value={device.power_watts ? `${device.power_watts} W` : null} />
            </CardBody>
          </Card>

          {device.notes && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-ink">Notizen</h2>
              </CardHeader>
              <CardBody>
                <p className="whitespace-pre-wrap text-sm text-ink-muted">{device.notes}</p>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-ink">Aktueller Status</h2>
            </CardHeader>
            <CardBody>
              <DeviceStatusBadge status={device.status} />
            </CardBody>
          </Card>

          {primaryBarcode && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-ink">Barcode</h2>
              </CardHeader>
              <CardBody className="flex flex-col items-center gap-3">
                <p className="font-mono text-sm text-ink-muted">{primaryBarcode.code}</p>
                <BarcodeLabel code={primaryBarcode.code} deviceName={device.name} />
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function DataField({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-ink-faint">{label}</p>
      <p className={cn("mt-0.5 text-ink", mono && "font-mono text-sm")}>{value || "—"}</p>
    </div>
  );
}
