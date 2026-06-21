import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Input";
import { useCreateDevice, useNextBarcodeSuggestion, useCategories, useUploadDevicePhoto } from "@/hooks/useDevices";

export function CreateDeviceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createDevice = useCreateDevice();
  const uploadPhoto = useUploadDevicePhoto();
  const { data: suggestedBarcode } = useNextBarcodeSuggestion();
  const { data: categories } = useCategories();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [location, setLocation] = useState("");
  const [barcode, setBarcode] = useState("");
  const [notes, setNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (suggestedBarcode && !barcode) setBarcode(suggestedBarcode);
  }, [suggestedBarcode, barcode]);

  function reset() {
    setName(""); setCategoryId(""); setManufacturer(""); setModel("");
    setLocation(""); setBarcode(suggestedBarcode ?? ""); setNotes("");
    setPhotoFile(null); setPhotoPreview(null);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  }

  function removePhoto() {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !barcode.trim()) return;

    const device = await createDevice.mutateAsync({
      name: name.trim(),
      category_id: categoryId || null,
      manufacturer: manufacturer.trim() || null,
      model: model.trim() || null,
      location: location.trim() || null,
      notes: notes.trim() || null,
      barcode: barcode.trim(),
    });

    // Foto hochladen falls vorhanden
    if (photoFile && device?.id) {
      await uploadPhoto.mutateAsync({ deviceId: device.id, file: photoFile });
    }

    reset();
    onClose();
  }

  const isPending = createDevice.isPending || uploadPhoto.isPending;

  return (
    <Dialog open={open} onClose={onClose} title="Neues Gerät anlegen">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Gerätename *">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder='z.B. Aktivbox 15"' required />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Hersteller">
            <Input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="z.B. RCF" />
          </FormField>
          <FormField label="Modell">
            <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="z.B. ART 715-A" />
          </FormField>
        </div>

        <FormField label="Kategorie">
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Keine Kategorie</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>{c.parent_id ? `— ${c.name}` : c.name}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Lagerort">
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="z.B. Lager A, Regal 1" />
        </FormField>

        <FormField label="Barcode *" hint="Wird automatisch vorgeschlagen, kann aber überschrieben werden.">
          <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} className="font-mono" required />
        </FormField>

        {/* Foto-Upload */}
        <div>
          <p className="mb-2 text-xs font-medium text-ink-muted">Produktbild (optional)</p>
          {photoPreview ? (
            <div className="relative inline-block">
              <img
                src={photoPreview}
                alt="Vorschau"
                className="h-32 w-32 rounded-lg object-cover border border-border"
              />
              <button
                type="button"
                onClick={removePhoto}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-status-defekt text-white shadow"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-32 w-32 flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border text-ink-faint transition-colors hover:border-accent hover:text-accent"
            >
              <ImagePlus size={22} />
              <span className="text-xs">Bild hinzufügen</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>

        <FormField label="Notizen">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </FormField>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Abbrechen</Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Wird gespeichert …" : "Gerät anlegen"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
