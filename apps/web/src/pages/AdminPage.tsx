import { useEffect, useState } from "react";
import { Plus, Trash2, KeyRound, ShieldCheck, User as UserIcon, Building2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { FormField, Input, Select, Textarea } from "@/components/ui/Input";
import { useCompanySettings, useUpdateCompanySettings } from "@/hooks/useCompanySettings";
import { LoadingState, ErrorState } from "@/components/ui/States";
import {
  useAdminUsers,
  useCreateUser,
  useDeleteUser,
  useResetUserPassword,
  useSetUserRole,
  useSetAreaAccess,
  useSetJobViewMode,
  type AdminUser,
} from "@/hooks/useAdminUsers";
import { useAuth } from "@/auth/AuthProvider";
import {
  APP_AREAS,
  JOB_VIEW_MODE_OPTIONS,
  USER_ROLE_OPTIONS,
  type AppArea,
  type JobViewMode,
  type UserRole,
} from "@/types/database";
import { cn } from "@/lib/cn";

const MANAGER_ROLES: UserRole[] = ["admin", "verwaltung"];

type AccessState = "none" | "view" | "edit";

function accessStateOf(user: AdminUser, area: AppArea): AccessState {
  const row = user.access.find((a) => a.area === area);
  if (!row) return "none";
  return row.can_edit ? "edit" : "view";
}

export function AdminPage() {
  const { data: users, isLoading, error } = useAdminUsers();
  const { user: me, isAdmin } = useAuth();
  const setRole = useSetUserRole();
  const setAccess = useSetAreaAccess();
  const setViewMode = useSetJobViewMode();
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
        description={
          isAdmin
            ? "Nutzer anlegen, Rollen vergeben, Bereichsrechte und Job-Sichtmodi steuern."
            : "Bereichsrechte, Job-Zuweisungen und Sichtmodi steuern. (Accounts/Rollen nur Admin.)"
        }
        actions={
          isAdmin ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              Nutzer anlegen
            </Button>
          ) : undefined
        }
      />

      {isAdmin && (
        <div className="mb-6">
          <CompanySettingsCard />
        </div>
      )}

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
                    {MANAGER_ROLES.includes(user.role) ? <ShieldCheck size={18} /> : <UserIcon size={18} />}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {user.full_name || user.email || "—"}
                      {isMe && <span className="ml-2 text-xs text-ink-faint">(du)</span>}
                    </p>
                    <p className="text-xs text-ink-muted">{user.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                    Sicht
                    <Select
                      value={user.job_view_mode}
                      disabled={!isAdmin && !isMe}
                      onChange={(e) =>
                        setViewMode.mutate(
                          { userId: user.id, mode: e.target.value as JobViewMode },
                          { onError: (err) => alert(`Fehler: ${err.message}`) },
                        )
                      }
                      className="h-9 w-36"
                      title={
                        !isAdmin && !isMe
                          ? "Nur der Admin kann den Sichtmodus anderer ändern"
                          : "Welche Jobs dieser Nutzer sieht"
                      }
                    >
                      {JOB_VIEW_MODE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                  </label>
                  {isAdmin ? (
                    <Select
                      value={user.role}
                      onChange={(e) => setRole.mutate({ userId: user.id, role: e.target.value as UserRole })}
                      disabled={isMe}
                      className="h-9 w-40"
                      title={isMe ? "Eigene Rolle nicht änderbar" : undefined}
                    >
                      {USER_ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <span className="rounded-md border border-border px-3 py-1.5 text-xs text-ink-muted">
                      {USER_ROLE_OPTIONS.find((o) => o.value === user.role)?.label ?? user.role}
                    </span>
                  )}
                  {isAdmin && (
                    <>
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
                    </>
                  )}
                </div>
              </CardHeader>
              <CardBody>
                {MANAGER_ROLES.includes(user.role) ? (
                  <p className="text-sm text-ink-muted">
                    {user.role === "admin" ? "Administratoren" : "Verwaltung"} haben vollen Zugriff auf alle Bereiche.
                  </p>
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

/** Firmendaten für die Angebots-PDFs (Briefkopf/Fußzeile) — nur Admin. */
function CompanySettingsCard() {
  const { data, isLoading } = useCompanySettings();
  const update = useUpdateCompanySettings();
  const [form, setForm] = useState({
    name: "", addressText: "", phone: "", email: "", website: "", tax_id: "", bank_line: "", payment_terms: "",
  });
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data && !loaded) {
      setForm({
        name: data.name ?? "",
        addressText: (data.address_lines ?? []).join("\n"),
        phone: data.phone ?? "",
        email: data.email ?? "",
        website: data.website ?? "",
        tax_id: data.tax_id ?? "",
        bank_line: data.bank_line ?? "",
        payment_terms: data.payment_terms ?? "",
      });
      setLoaded(true);
    }
  }, [data, loaded]);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  }

  async function handleSave() {
    await update.mutateAsync({
      name: form.name.trim(),
      address_lines: form.addressText.split("\n").map((l) => l.trim()).filter(Boolean),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      website: form.website.trim() || null,
      tax_id: form.tax_id.trim() || null,
      bank_line: form.bank_line.trim() || null,
      payment_terms: form.payment_terms.trim() || null,
    });
    setSaved(true);
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Building2 size={15} />
          Firmendaten (Angebots-PDF)
        </h2>
      </CardHeader>
      <CardBody className="space-y-4">
        {isLoading && !loaded ? (
          <p className="text-sm text-ink-faint">Wird geladen …</p>
        ) : (
          <>
            <p className="text-xs text-ink-muted">
              Diese Daten erscheinen im Briefkopf und in der Fußzeile der Angebots-PDFs.
            </p>
            <FormField label="Firmenname">
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
            </FormField>
            <FormField label="Adresse (eine Zeile pro Zeile)">
              <Textarea value={form.addressText} onChange={(e) => set("addressText", e.target.value)} rows={2} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Telefon">
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </FormField>
              <FormField label="E-Mail">
                <Input value={form.email} onChange={(e) => set("email", e.target.value)} />
              </FormField>
              <FormField label="Website">
                <Input value={form.website} onChange={(e) => set("website", e.target.value)} />
              </FormField>
              <FormField label="USt-IdNr.">
                <Input value={form.tax_id} onChange={(e) => set("tax_id", e.target.value)} />
              </FormField>
            </div>
            <FormField label="Bankverbindung (Fußzeile)">
              <Input value={form.bank_line} onChange={(e) => set("bank_line", e.target.value)} />
            </FormField>
            <FormField label="Zahlungs-/Hinweistext unter dem Angebot">
              <Textarea value={form.payment_terms} onChange={(e) => set("payment_terms", e.target.value)} rows={2} />
            </FormField>
            <div className="flex items-center gap-3">
              <Button onClick={handleSave} disabled={update.isPending}>
                {update.isPending ? "Speichert …" : "Firmendaten speichern"}
              </Button>
              {saved && <span className="text-xs text-status-verfuegbar">Gespeichert.</span>}
            </div>
          </>
        )}
      </CardBody>
    </Card>
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
              {USER_ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
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
