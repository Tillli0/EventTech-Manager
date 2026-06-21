import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Input";
import { useCreateCustomer } from "@/hooks/useCustomers";
import { CUSTOMER_SOURCE_LABELS, type CustomerSource } from "@/types/database";

export function CreateCustomerDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createCustomer = useCreateCustomer();

  const [companyName, setCompanyName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState<CustomerSource>("sonstiges");

  function reset() {
    setCompanyName("");
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setSource("sonstiges");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim() && !firstName.trim() && !lastName.trim()) return;

    await createCustomer.mutateAsync({
      company_name: companyName.trim() || null,
      first_name: firstName.trim() || null,
      last_name: lastName.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      source,
    });

    reset();
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Neuen Kunden anlegen">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Firma">
          <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="z.B. Gasthaus zur Linde GmbH" />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Vorname">
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </FormField>
          <FormField label="Nachname">
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="E-Mail">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormField>
          <FormField label="Telefon">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </FormField>
        </div>

        <FormField label="Herkunft">
          <Select value={source} onChange={(e) => setSource(e.target.value as CustomerSource)}>
            {Object.entries(CUSTOMER_SOURCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FormField>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={createCustomer.isPending}>
            {createCustomer.isPending ? "Wird gespeichert …" : "Kunde anlegen"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
