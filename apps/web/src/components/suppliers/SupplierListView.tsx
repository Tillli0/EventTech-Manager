import { useMemo, useState } from "react";
import { Search, Truck, Mail, Phone, Globe, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/States";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useSuppliers, useDeleteSupplier } from "@/hooks/useSuppliers";
import { CreateSupplierDialog } from "@/components/suppliers/CreateSupplierDialog";
import type { Supplier } from "@/types/database";
import { useAuth } from "@/auth/AuthProvider";

export function SupplierListView() {
  const { canEdit } = useAuth();
  const mayEdit = canEdit("anmietung");
  const { data: suppliers, isLoading, error } = useSuppliers();
  const deleteSupplier = useDeleteSupplier();
  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const [editSupplier, setEditSupplier] = useState<Supplier | undefined>(undefined);

  const filtered = useMemo(() => {
    if (!suppliers) return [];
    if (!search.trim()) return suppliers;
    const q = search.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.contact_person?.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q),
    );
  }, [suppliers, search]);

  async function handleDelete(supplier: Supplier) {
    const ok = await confirm({
      title: "Verleih-Partner löschen",
      message: `„${supplier.name}" wirklich löschen? Das geht nur, solange keine Anmiet-Vorgänge auf diesen Partner verweisen.`,
      confirmLabel: "Löschen",
      danger: true,
    });
    if (!ok) return;
    await deleteSupplier.mutateAsync(supplier.id);
  }

  if (isLoading) return <LoadingState label="Verleih-Partner werden geladen …" />;
  if (error) return <ErrorState message={error.message} />;

  return (
    <div>
      <div className="mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suche nach Name, Ansprechpartner oder Ort …"
            className="pl-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Keine Verleih-Partner gefunden"
          description={suppliers?.length === 0 ? "Noch keinen Partner angelegt." : undefined}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((supplier) => (
            <Card key={supplier.id} className="flex items-center gap-3 border-l-[3px] border-l-accent px-4 py-3">
              <div className="min-w-0 flex-1">
                <span className="font-medium text-ink">{supplier.name}</span>
                {supplier.contact_person && (
                  <p className="text-xs text-ink-faint">{supplier.contact_person}</p>
                )}
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-ink-muted">
                  {supplier.email && (
                    <span className="flex items-center gap-1">
                      <Mail size={12} />
                      {supplier.email}
                    </span>
                  )}
                  {supplier.phone && (
                    <span className="flex items-center gap-1">
                      <Phone size={12} />
                      {supplier.phone}
                    </span>
                  )}
                  {supplier.website && (
                    <span className="flex items-center gap-1">
                      <Globe size={12} />
                      {supplier.website}
                    </span>
                  )}
                </div>
              </div>

              {(supplier.city || supplier.zip) && (
                <span className="hidden shrink-0 text-xs text-ink-faint sm:block">
                  {[supplier.zip, supplier.city].filter(Boolean).join(" ")}
                </span>
              )}

              {mayEdit && (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => setEditSupplier(supplier)}
                    className="rounded p-1.5 text-ink-faint transition-colors hover:text-accent"
                    title="Bearbeiten"
                    aria-label="Bearbeiten"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(supplier)}
                    className="rounded p-1.5 text-ink-faint transition-colors hover:text-status-defekt"
                    title="Löschen"
                    aria-label="Löschen"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <CreateSupplierDialog
        open={!!editSupplier}
        onClose={() => setEditSupplier(undefined)}
        editSupplier={editSupplier}
      />
    </div>
  );
}
