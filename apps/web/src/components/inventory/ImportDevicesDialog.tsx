import { useRef, useState } from "react";
import { Upload, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { parseCsv } from "@/lib/csv";
import { useImportDevices, type ImportDeviceRow, type ImportDevicesResult } from "@/hooks/useDevices";
import { DEVICE_STATUS_OPTIONS, type DeviceStatus } from "@/types/database";

const STATUS_BY_LABEL = new Map(DEVICE_STATUS_OPTIONS.map((o) => [o.label.toLowerCase(), o.value]));
const STATUS_VALUES = new Set(DEVICE_STATUS_OPTIONS.map((o) => o.value));

function toNumber(value: string | undefined): number | null {
  if (!value || !value.trim()) return null;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function toStatus(value: string | undefined): DeviceStatus | null {
  if (!value || !value.trim()) return null;
  const v = value.trim().toLowerCase();
  if (STATUS_VALUES.has(v as DeviceStatus)) return v as DeviceStatus;
  return STATUS_BY_LABEL.get(v) ?? null;
}

function rowsFromCsv(text: string): ImportDeviceRow[] {
  const records = parseCsv(text);
  return records.map((r) => ({
    name: r["Name"] ?? "",
    category: r["Kategorie"] ?? null,
    manufacturer: r["Hersteller"] ?? null,
    model: r["Modell"] ?? null,
    barcode: r["Barcode"] ?? null,
    location: r["Lagerort"] ?? null,
    stock_quantity: toNumber(r["Bestand"]),
    status: toStatus(r["Status"]),
    daily_rental_price: toNumber(r["Tagesmietpreis"]),
    replacement_value: toNumber(r["Wiederbeschaffungswert"]),
  }));
}

export function ImportDevicesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importDevices = useImportDevices();
  const [rows, setRows] = useState<ImportDeviceRow[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ImportDevicesResult | null>(null);

  function handleClose() {
    setRows(null);
    setFileName(null);
    setResult(null);
    onClose();
  }

  async function handleFile(file: File) {
    const text = await file.text();
    const parsed = rowsFromCsv(text);
    setRows(parsed);
    setFileName(file.name);
    setResult(null);
  }

  async function handleImport() {
    if (!rows) return;
    const res = await importDevices.mutateAsync(rows);
    setResult(res);
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Inventar aus CSV importieren">
      <div className="space-y-4">
        <p className="text-sm text-ink-muted">
          Erwartet das gleiche Format wie der CSV-Export: Spalten <code>Name</code>, <code>Kategorie</code>,{" "}
          <code>Hersteller</code>, <code>Modell</code>, <code>Barcode</code>, <code>Lagerort</code>,{" "}
          <code>Bestand</code>, <code>Status</code>, <code>Tagesmietpreis</code>,{" "}
          <code>Wiederbeschaffungswert</code>; Trennzeichen Semikolon. Geräte mit vorhandenem Barcode werden
          aktualisiert, alle anderen neu angelegt.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
          <Upload size={16} />
          CSV-Datei wählen
        </Button>

        {fileName && rows && !result && (
          <div className="rounded-lg border border-border bg-bg-raised p-4 text-sm">
            <p className="font-medium text-ink">{fileName}</p>
            <p className="mt-1 text-ink-muted">{rows.length} Zeilen erkannt.</p>
          </div>
        )}

        {result && (
          <div className="space-y-2 rounded-lg border border-border bg-bg-raised p-4 text-sm">
            <p className="flex items-center gap-2 font-medium text-ink">
              <CheckCircle2 size={16} className="text-status-verfuegbar" />
              {result.created} neu angelegt, {result.updated} aktualisiert.
            </p>
            {result.errors.length > 0 && (
              <div className="space-y-1">
                <p className="flex items-center gap-2 font-medium text-status-defekt">
                  <AlertTriangle size={16} />
                  {result.errors.length} Zeile(n) mit Fehler:
                </p>
                <ul className="ml-6 list-disc text-ink-muted">
                  {result.errors.map((e, i) => (
                    <li key={i}>
                      Zeile {e.row} ({e.name || "ohne Name"}): {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={handleClose}>
            {result ? "Schließen" : "Abbrechen"}
          </Button>
          {!result && (
            <Button onClick={handleImport} disabled={!rows || rows.length === 0 || importDevices.isPending}>
              {importDevices.isPending ? "Importiere …" : "Importieren"}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
