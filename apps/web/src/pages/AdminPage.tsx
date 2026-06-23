import { useState } from "react";
import { Plus, Trash2, KeyRound, ShieldCheck, User as UserIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { FormField, Input, Select } from "@/components/ui/Input";
import { LoadingState, ErrorState } from "@/components/ui/States";
import {
  useAdminUsers,
  useCreateUser,
  useDeleteUser,
  useResetUserPassword,
  useSetUserRole,
  useSetAreaAccess,
  type AdminUser,
} from "@/hooks/useAdminUsers";
import { useAuth } from "@/auth/AuthProvider";
import { APP_AREAS, type AppArea, type UserRole } from "@/types/database";
import { cn } from "@/lib/cn";

type AccessState = "none" | "view" | "edit";

function accessStateOf(user: AdminUser, area: AppArea): AccessState {
  const row = user.access.find((a) => a.area === area);
  if (!row) return "none";
  return row.can_edit ? "edit" : "view";
}

export function AdminPage() {
  const { data: users, isLoading, error } = useAdminUsers();
  const { user: me } = useAuth();
  const setRole = useSetUserRole();
  const setAccess = useSetAreaAccess();
  const deleteUser = useDeleteUser();
  const resetPassword = useResetUserPassword();
  const [createOpen, setCreateOpen] = useState(false);

  function handleResetPassword(userId: string) {
    const pw = prompt("Neues Passwort (min. 6 Zeichen):");
    if (!pw) return;
    if (pw.length < 6) {
      alert("Passwort muss mindestens 6 Zeichen haben.");
      return;
    }
    resetPassword.mutate(
      { userId, password: pw },
      {
        onSuccess: () => alert("Passwort wurde geändert."),
        onError: (e) => alert(`Fehler: ${e.message}`),
      },
    );
  }

  return (
    <div>
      <PageHeader
        title="Verwaltung"
        description="Nutzer anlegen, Rollen vergeben und pro Bereich Lese-/Bearbeitungsrechte steuern."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            Nutzer anlegen
          </Button>
        }
      />

      {isLoading && <LoadingState label="Nutzer werden geladen …" />}
      {error && <ErrorState message={error.message} />}

      <div className="space-y-4">
        {users?.map((user) => {
          const isMe = user.id === me?.id;
          return (
            <Card key={user.id}>
              <CardHeader className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-raised text-ink-muted">
                    {user.role === "admin" ? <ShieldCheck size={18} /> : <UserIcon size={18} />}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {user.full_name || user.email || "—"}
                      {isMe && <span className="ml-2 text-xs text-ink-faint">(du)</span>}
                    </p>
                    <p className="text-xs text-ink-muted">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={user.role}
                    onChange={(e) => setRole.mutate({ userId: user.id, role: e.target.value as UserRole })}
                    disabled={isMe}
                    className="h-9 w-40"
                    title={isMe ? "Eigene Rolle nicht änderbar" : undefined}
                  >
                    <option value="mitarbeiter">Mitarbeiter</option>
                    <option value="admin">Administrator</option>
                  </Select>
                  <Button size="sm" variant="secondary" onClick={() => handleResetPassword(user.id)}>
                    <KeyRound size={14} />
                    Passwort
                  </Button>
                  {!isMe && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Nutzer „${user.full_name || user.email}" wirklich löschen?`)) {
                          deleteUser.mutate(user.id, { onError: (e) => alert(`Fehler: ${e.message}`) });
                        }
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:text-status-defekt"
                      aria-label="Nutzer löschen"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardBody>
                {user.role === "admin" ? (
                  <p className="text-sm text-ink-muted">Administratoren haben vollen Zugriff auf alle Bereiche.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {APP_AREAS.map((area) => {
                      const state = accessStateOf(user, area.value);
                      return (
                        <div
                          key={area.value}
                          className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                        >
                          <span className="text-sm text-ink">{area.label}</span>
                          <div className="flex gap-1 rounded-md bg-bg-raised p-0.5">
                            {(
                              [
                                { value: "none", label: "Kein" },
                                { value: "view", label: "Lesen" },
                                { value: "edit", label: "Bearb." },
                              ] as const
                            ).map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() =>
                                  setAccess.mutate({ userId: user.id, area: area.value, state: opt.value })
                                }
                                className={cn(
                                  "rounded px-2 py-1 text-xs font-medium transition-colors",
                                  state === opt.value
                                    ? "bg-bg-surface text-ink shadow-sm"
                                    : "text-ink-muted hover:text-ink",
                                )}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function CreateUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createUser = useCreateUser();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("mitarbeiter");
  const [areas, setAreas] = useState<Record<AppArea, AccessState>>(() =>
    Object.fromEntries(APP_AREAS.map((a) => [a.value, "none"])) as Record<AppArea, AccessState>,
  );
  const [formError, setFormError] = useState<string | null>(null);

  function reset() {
    setEmail("");
    setFullName("");
    setPassword("");
    setRole("mitarbeiter");
    setAreas(Object.fromEntries(APP_AREAS.map((a) => [a.value, "none"])) as Record<AppArea, AccessState>);
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!email.trim() || password.length < 6) {
      setFormError("E-Mail und ein Passwort mit mindestens 6 Zeichen sind erforderlich.");
      return;
    }
    try {
      await createUser.mutateAsync({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        role,
        areas: APP_AREAS.filter((a) => areas[a.value] !== "none").map((a) => ({
          area: a.value,
          can_edit: areas[a.value] === "edit",
        })),
      });
      reset();
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Nutzer konnte nicht angelegt werden.");
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Nutzer anlegen" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Name">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Max Mustermann" />
          </FormField>
          <FormField label="Rolle">
            <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="mitarbeiter">Mitarbeiter</option>
              <option value="admin">Administrator</option>
            </Select>
          </FormField>
        </div>
        <FormField label="E-Mail *">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@firma.de" required />
        </FormField>
        <FormField label="Initialpasswort *" hint="Mindestens 6 Zeichen. Der Nutzer kann es später ändern.">
          <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </FormField>

        {role === "mitarbeiter" && (
          <div>
            <p className="mb-2 text-xs font-medium text-ink-muted">Bereichszugriff</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {APP_AREAS.map((area) => (
                <div key={area.value} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span className="text-sm text-ink">{area.label}</span>
                  <Select
                    value={areas[area.value]}
                    onChange={(e) => setAreas((prev) => ({ ...prev, [area.value]: e.target.value as AccessState }))}
                    className="h-8 w-28"
                  >
                    <option value="none">Kein</option>
                    <option value="view">Lesen</option>
                    <option value="edit">Bearbeiten</option>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}

        {formError && (
          <div className="rounded-md border border-status-defekt/40 bg-status-defekt/10 px-3 py-2 text-sm text-status-defekt">
            {formError}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={createUser.isPending}>
            {createUser.isPending ? "Wird angelegt …" : "Nutzer anlegen"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
