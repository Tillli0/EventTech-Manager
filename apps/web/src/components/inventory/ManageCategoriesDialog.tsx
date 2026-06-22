import { useState } from "react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, FormField } from "@/components/ui/Input";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/useDevices";
import type { Category } from "@/types/database";

const PRESET_COLORS = [
  "#6366f1", "#0ea5e9", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#8b5cf6", "#14b8a6",
  "#f97316", "#84cc16",
];

export function ManageCategoriesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: categories } = useCategories();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();

  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) return;
    await createCategory.mutateAsync({ name: name.trim(), color });
    setName("");
  }

  async function handleDelete(id: string, catName: string) {
    if (!confirm(`Kategorie „${catName}" wirklich löschen? Geräte bleiben erhalten, verlieren aber die Kategorie.`)) return;
    await deleteCategory.mutateAsync(id);
  }

  const rootCategories = categories?.filter((c) => !c.parent_id) ?? [];

  return (
    <Dialog open={open} onClose={onClose} title="Kategorien verwalten">
      <div className="space-y-5">
        {/* Neue Kategorie anlegen */}
        <div className="space-y-3 rounded-lg border border-border p-4">
          <p className="text-sm font-medium text-ink">Neue Kategorie</p>
          <FormField label="Name *">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Audio, Licht, Kabel …"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </FormField>
          <div>
            <p className="mb-2 text-xs text-ink-muted">Farbe</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? "white" : "transparent",
                    boxShadow: color === c ? `0 0 0 2px ${c}` : undefined,
                  }}
                />
              ))}
            </div>
          </div>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || createCategory.isPending}
            className="w-full"
          >
            <Plus size={15} />
            Kategorie anlegen
          </Button>
        </div>

        {/* Bestehende Kategorien */}
        {rootCategories.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-ink">Bestehende Kategorien</p>
            <div className="space-y-1.5">
              {rootCategories.map((cat) =>
                editingId === cat.id ? (
                  <EditCategoryRow key={cat.id} category={cat} onDone={() => setEditingId(null)} />
                ) : (
                  <div
                    key={cat.id}
                    className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: cat.color ?? "#6366f1" }}
                    />
                    <span className="flex-1 text-sm text-ink">{cat.name}</span>
                    <button
                      onClick={() => setEditingId(cat.id)}
                      className="text-ink-faint transition-colors hover:text-accent"
                      title="Bearbeiten"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id, cat.name)}
                      className="text-ink-faint transition-colors hover:text-status-defekt"
                      title="Löschen"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        {rootCategories.length === 0 && (
          <p className="text-center text-sm text-ink-faint py-4">Noch keine Kategorien vorhanden.</p>
        )}

        <div className="flex justify-end border-t border-border pt-3">
          <Button variant="secondary" onClick={onClose}>Schließen</Button>
        </div>
      </div>
    </Dialog>
  );
}

function EditCategoryRow({ category, onDone }: { category: Category; onDone: () => void }) {
  const updateCategory = useUpdateCategory();
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color ?? PRESET_COLORS[0]);

  async function handleSave() {
    if (!name.trim()) return;
    await updateCategory.mutateAsync({ id: category.id, name: name.trim(), color });
    onDone();
  }

  return (
    <div className="space-y-2.5 rounded-md border border-accent bg-accent-soft px-3 py-2.5">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        autoFocus
      />
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
            style={{
              backgroundColor: c,
              borderColor: color === c ? "white" : "transparent",
              boxShadow: color === c ? `0 0 0 2px ${c}` : undefined,
            }}
          />
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onDone}>
          <X size={13} />
          Abbrechen
        </Button>
        <Button size="sm" onClick={handleSave} disabled={!name.trim() || updateCategory.isPending}>
          <Check size={13} />
          Speichern
        </Button>
      </div>
    </div>
  );
}
