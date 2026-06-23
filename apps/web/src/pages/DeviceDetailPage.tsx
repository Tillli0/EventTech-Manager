import { useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Printer, Trash2, Pencil, Check, ImagePlus, Star, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DeviceStatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState, ErrorState } from "@/components/ui/States";
import {
  useDevice,
  useUpdateDevice,
  useUpdateDeviceStatus,
  useDeleteDevice,
  useDevicePhotos,
  useUploadDevicePhoto,
  useDeleteDevicePhoto,
  useSetCoverPhoto,
  devicePhotoUrl,
} from "@/hooks/useDevices";
import { DEVICE_STATUS_OPTIONS, type DeviceStatus } from "@/types/database";
import { formatCurrency, formatDate } from "@/lib/format";
import { BarcodeLabel, printBarcodeLabels } from "@/components/barcode/BarcodeLabel";
import { useAuth } from "@/auth/AuthProvider";
import { cn } from "@/lib/cn";

export function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const mayEdit = canEdit("inventar");
  const { data: device, isLoading, error } = useDevice(id);
  const updateStatus = useUpdateDeviceStatus();
  const updateDevice = useUpdateDevice();
  const deleteDevice = useDeleteDevice();
  const [editingStock, setEditingStock] = useState(false);
  const [stockInput, setStockInput] = useState("1");
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState("");

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
            {mayEdit && (
              <Button variant="danger" onClick={handleDelete}>
                <Trash2 size={16} />
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          {mayEdit && (
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
          )}

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
                ) : mayEdit ? (
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
                ) : (
                  <p className="mt-0.5 text-ink">
                    {device.stock_quantity}
                    {device.stock_quantity > 1 && " Stück"}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-ink-faint">Tagesmietpreis</p>
                {editingPrice ? (
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      className="h-8 w-24"
                      autoFocus
                    />
                    <button
                      onClick={async () => {
                        const raw = priceInput.trim().replace(",", ".");
                        const parsed = raw === "" ? null : Math.max(0, parseFloat(raw) || 0);
                        await updateDevice.mutateAsync({ id: device.id, daily_rental_price: parsed });
                        setEditingPrice(false);
                      }}
                      className="rounded p-1 text-accent hover:bg-accent-soft"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                ) : mayEdit ? (
                  <button
                    onClick={() => {
                      setPriceInput(device.daily_rental_price != null ? String(device.daily_rental_price) : "");
                      setEditingPrice(true);
                    }}
                    className="mt-0.5 flex items-center gap-1.5 text-ink hover:text-accent"
                  >
                    {formatCurrency(device.daily_rental_price)}
                    <Pencil size={11} className="text-ink-faint" />
                  </button>
                ) : (
                  <p className="mt-0.5 text-ink">{formatCurrency(device.daily_rental_price)}</p>
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
          <DevicePhotosCard deviceId={device.id} canEdit={mayEdit} />

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

function DevicePhotosCard({ deviceId, canEdit }: { deviceId: string; canEdit: boolean }) {
  const { data: photos, isLoading } = useDevicePhotos(deviceId);
  const uploadPhoto = useUploadDevicePhoto();
  const deletePhoto = useDeleteDevicePhoto();
  const setCover = useSetCoverPhoto();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cover zuerst anzeigen, danach nach sort_order.
  const sorted = [...(photos ?? [])].sort((a, b) => {
    if (a.is_cover !== b.is_cover) return a.is_cover ? -1 : 1;
    return a.sort_order - b.sort_order;
  });

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      await uploadPhoto.mutateAsync({ deviceId, file });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const isBusy = uploadPhoto.isPending || deletePhoto.isPending || setCover.isPending;

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Fotos</h2>
        {canEdit && (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isBusy}
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline disabled:opacity-50"
            >
              <ImagePlus size={14} />
              Hinzufügen
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFiles}
            />
          </>
        )}
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <p className="text-sm text-ink-faint">Wird geladen …</p>
        ) : sorted.length === 0 ? (
          canEdit ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-28 w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border text-ink-faint transition-colors hover:border-accent hover:text-accent"
            >
              <ImagePlus size={22} />
              <span className="text-xs">Erstes Bild hinzufügen</span>
            </button>
          ) : (
            <p className="text-sm text-ink-faint">Keine Fotos vorhanden.</p>
          )
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {sorted.map((photo) => (
              <div key={photo.id} className="group relative">
                <img
                  src={devicePhotoUrl(photo.storage_path)}
                  alt="Gerätefoto"
                  className={cn(
                    "aspect-square w-full rounded-lg object-cover",
                    photo.is_cover ? "ring-2 ring-accent" : "border border-border",
                  )}
                />
                {photo.is_cover && (
                  <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-0.5 rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-white">
                    <Star size={9} className="fill-current" />
                    Cover
                  </span>
                )}
                {canEdit && (
                <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {!photo.is_cover && (
                    <button
                      type="button"
                      title="Als Cover festlegen"
                      disabled={isBusy}
                      onClick={() => setCover.mutate({ id: photo.id, deviceId })}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-bg-surface/90 text-ink-muted shadow hover:text-accent"
                    >
                      <Star size={12} />
                    </button>
                  )}
                  <button
                    type="button"
                    title="Foto löschen"
                    disabled={isBusy}
                    onClick={() => {
                      if (!confirm("Foto wirklich löschen?")) return;
                      deletePhoto.mutate({ id: photo.id, storagePath: photo.storage_path, deviceId });
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-bg-surface/90 text-ink-muted shadow hover:text-status-defekt"
                  >
                    <X size={12} />
                  </button>
                </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
