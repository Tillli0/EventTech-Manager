import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Input";
import { useCreateVenue, useUpdateVenue } from "@/hooks/useVenues";
import type { Venue } from "@/types/database";

export function CreateVenueDialog({
  open,
  onClose,
  editVenue,
}: {
  open: boolean;
  onClose: () => void;
  /** Wenn gesetzt: bestehenden Ort bearbeiten statt neu anlegen. */
  editVenue?: Venue;
}) {
  const createVenue = useCreateVenue();
  const updateVenue = useUpdateVenue();
  const isEdit = !!editVenue;

  const [name, setName] = useState("");
  const [street, setStreet] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [accessNotes, setAccessNotes] = useState("");
  const [parkingNotes, setParkingNotes] = useState("");
  const [powerNotes, setPowerNotes] = useState("");
  const [specialNotes, setSpecialNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(editVenue?.name ?? "");
    setStreet(editVenue?.address_street ?? "");
    setZip(editVenue?.address_zip ?? "");
    setCity(editVenue?.address_city ?? "");
    setContactPerson(editVenue?.contact_person ?? "");
    setContactPhone(editVenue?.contact_phone ?? "");
    setAccessNotes(editVenue?.access_notes ?? "");
    setParkingNotes(editVenue?.parking_notes ?? "");
    setPowerNotes(editVenue?.power_notes ?? "");
    setSpecialNotes(editVenue?.special_notes ?? "");
  }, [open, editVenue]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const fields = {
      name: name.trim(),
      address_street: street.trim() || null,
      address_zip: zip.trim() || null,
      address_city: city.trim() || null,
      contact_person: contactPerson.trim() || null,
      contact_phone: contactPhone.trim() || null,
      access_notes: accessNotes.trim() || null,
      parking_notes: parkingNotes.trim() || null,
      power_notes: powerNotes.trim() || null,
      special_notes: specialNotes.trim() || null,
    };

    if (isEdit && editVenue) {
      await updateVenue.mutateAsync({ id: editVenue.id, ...fields });
    } else {
      await createVenue.mutateAsync(fields);
    }
    onClose();
  }

  const isPending = createVenue.isPending || updateVenue.isPending;

  return (
    <Dialog open={open} onClose={onClose} title={isEdit ? "Ort bearbeiten" : "Neuen Ort anlegen"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Name *">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Stadthalle Musterstadt" required />
        </FormField>

        <FormField label="Straße & Nr.">
          <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="z.B. Hauptstraße 1" />
        </FormField>

        <div className="grid grid-cols-3 gap-3">
          <FormField label="PLZ">
            <Input value={zip} onChange={(e) => setZip(e.target.value)} />
          </FormField>
          <div className="col-span-2">
            <FormField label="Ort">
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </FormField>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Ansprechpartner vor Ort">
            <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
          </FormField>
          <FormField label="Telefon">
            <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </FormField>
        </div>

        <FormField label="Zufahrt" hint="z.B. LKW-Zugang, Hoftor, Anlieferzeiten.">
          <Textarea value={accessNotes} onChange={(e) => setAccessNotes(e.target.value)} rows={2} />
        </FormField>

        <FormField label="Parken">
          <Textarea value={parkingNotes} onChange={(e) => setParkingNotes(e.target.value)} rows={2} />
        </FormField>

        <FormField label="Strom" hint="z.B. 32A CEE vorhanden.">
          <Textarea value={powerNotes} onChange={(e) => setPowerNotes(e.target.value)} rows={2} />
        </FormField>

        <FormField label="Besonderheiten">
          <Textarea value={specialNotes} onChange={(e) => setSpecialNotes(e.target.value)} rows={2} />
        </FormField>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={isPending || !name.trim()}>
            {isPending ? "Wird gespeichert …" : isEdit ? "Speichern" : "Ort anlegen"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
