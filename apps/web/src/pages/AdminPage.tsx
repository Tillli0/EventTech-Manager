import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, KeyRound, ShieldCheck, User as UserIcon, Building2, ImagePlus, X, DatabaseBackup, Package, HardDriveDownload } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { FormField, Input, Select, Textarea } from "@/components/ui/Input";
import {
  useCompanySettings,
  useUpdateCompanySettings,
  useUploadCompanyLogo,
  useRemoveCompanyLogo,
  companyLogoUrl,
} from "@/hooks/useCompanySettings";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
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
import { exportBackup, FULL_BACKUP_TABLES, INVENTORY_BACKUP_TABLES } from "@/lib/backup";
import {
  APP_AREAS,
  JOB_VIEW_MODE_OPTIONS,
  USER_ROLE_OPTIONS,
  type AppArea,
  type JobViewMode,
  type UserRole,
} from "@/types/database";

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
  const toast = useToast();
  const confirm = useConfirm();
  const [createOpen, setCreateOpen] = useState(false);
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [resetPw, setResetPw] = useState("");

  function submitReset() {
    if (!resetFor) return;
    if (resetPw.length < 6) {
      toast.error("Passwort muss mindestens 6 Zeichen haben.");
      return;
    }
    resetPassword.mutate(
      { userId: resetFor, password: resetPw },
      {
        onSuccess: () => {
          toast.success("Passwort wurde geändert.");
          setResetFor(null);
          setResetPw("");
        },
        onError: (e) => toast.error(`Fehler: ${e.message}`),
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

      <div className="mb-6">
        <BackupCard />
      </div>

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
                          { onError: (err) => toast.error(`Fehler: ${err.message}`) },
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
                      <Button size="sm" variant="secondary" onClick={() => { setResetFor(user.id); setResetPw(""); }}>
                        <KeyRound size={14} />
                        Passwort
                      </Button>
                      {!isMe && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (
                              await confirm({
                                title: "Nutzer löschen",
                                message: `Nutzer „${user.full_name || user.email}" wirklich löschen?`,
                                confirmLabel: "Löschen",
                                danger: true,
                              })
                            ) {
                              deleteUser.mutate(user.id, { onError: (e) => toast.error(`Fehler: ${e.message}`) });
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
                          <Tabs<AccessState>
                            size="sm"
                            options={[
                              { value: "none", label: "Kein" },
                              { value: "view", label: "Lesen" },
                              { value: "edit", label: "Bearb." },
                            ]}
                            value={state}
                            onChange={(next) =>
                              setAccess.mutate({ userId: user.id, area: area.value, state: next })
                            }
                          />
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

      <Dialog
        open={!!resetFor}
        onClose={() => { setResetFor(null); setResetPw(""); }}
        title="Passwort zurücksetzen"
        maxWidth="max-w-sm"
      >
        <div className="space-y-4">
          <FormField label="Neues Passwort (min. 6 Zeichen)">
            <Input
              type="password"
              value={resetPw}
              onChange={(e) => setResetPw(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && resetPw.length >= 6) submitReset();
              }}
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setResetFor(null); setResetPw(""); }}>
              Abbrechen
            </Button>
            <Button onClick={submitReset} disabled={resetPw.length < 6 || resetPassword.isPending}>
              {resetPassword.isPending ? "Speichert …" : "Passwort setzen"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

/**
 * Datensicherung: lädt die fachlichen Daten als JSON herunter (komplett oder nur
 * Inventar). Sichtbar für Admin und Verwaltung. Client-seitig über die RLS-Data-API
 * — kein Server, kein Secret nötig.
 */
function BackupCard() {
  const toast = useToast();
  const [running, setRunning] = useState<"komplett" | "inventar" | null>(null);
  const [last, setLast] = useState<string | null>(null);

  async function run(kind: "komplett" | "inventar") {
    setRunning(kind);
    try {
      const tables = kind === "komplett" ? FULL_BACKUP_TABLES : INVENTORY_BACKUP_TABLES;
      const result = await exportBackup(tables, kind);
      setLast(
        `${result.fileName} · ${result.tableCount} Tabellen, ${result.rowCount} Einträge` +
          (result.errors.length ? ` (${result.errors.length} übersprungen)` : ""),
      );
      if (result.errors.length) {
        toast.error(`Backup erstellt, aber ${result.errors.length} Tabelle(n) übersprungen (fehlende Rechte).`);
      } else {
        toast.success("Backup wurde als JSON heruntergeladen.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Backup fehlgeschlagen.");
    } finally {
      setRunning(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <DatabaseBackup size={15} />
          Datensicherung
        </h2>
      </CardHeader>
      <CardBody className="space-y-4">
        <p className="text-xs text-ink-muted">
          Lädt die Daten als JSON-Datei herunter — zum Aufbewahren oder als Sicherheitskopie.
          Bewahre die Datei an einem sicheren Ort auf (sie enthält Kunden- und Job-Daten).
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => run("komplett")} disabled={running !== null}>
            <HardDriveDownload size={16} />
            {running === "komplett" ? "Wird erstellt …" : "Komplettes Backup"}
          </Button>
          <Button variant="secondary" onClick={() => run("inventar")} disabled={running !== null}>
            <Package size={16} />
            {running === "inventar" ? "Wird erstellt …" : "Nur Inventar"}
          </Button>
        </div>
        {last && <p className="text-xs text-ink-faint">Zuletzt: {last}</p>}
      </CardBody>
    </Card>
  );
}

/** Firmendaten für die Angebots-PDFs (Briefkopf/Fußzeile) — nur Admin. */
function CompanySettingsCard() {
  const { data, isLoading } = useCompanySettings();
  const update = useUpdateCompanySettings();
  const uploadLogo = useUploadCompanyLogo();
  const removeLogo = useRemoveCompanyLogo();
  const toast = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: "", addressText: "", phone: "", email: "", website: "", tax_id: "", bank_line: "", payment_terms: "",
    lead_notify_email: "",
  });
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (logoInputRef.current) logoInputRef.current.value = "";
    if (!file) return;
    try {
      await uploadLogo.mutateAsync(file);
      toast.success("Logo hochgeladen.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Logo konnte nicht hochgeladen werden.");
    }
  }

  async function handleLogoRemove() {
    try {
      await removeLogo.mutateAsync(data?.logo_path ?? null);
      toast.success("Logo entfernt.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Logo konnte nicht entfernt werden.");
    }
  }

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
        lead_notify_email: data.lead_notify_email ?? "",
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
      lead_notify_email: form.lead_notify_email.trim() || null,
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

            <div>
              <p className="mb-2 text-xs font-medium text-ink-muted">Logo (Briefkopf)</p>
              <div className="flex items-center gap-4">
                {data?.logo_path ? (
                  <div className="relative inline-block">
                    <img
                      src={companyLogoUrl(data.logo_path)}
                      alt="Firmenlogo"
                      className="h-16 w-auto max-w-[180px] rounded border border-border bg-white object-contain p-1"
                    />
                    <button
                      type="button"
                      onClick={handleLogoRemove}
                      disabled={removeLogo.isPending}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-status-defekt text-white shadow"
                      title="Logo entfernen"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadLogo.isPending}
                    className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-ink-faint transition-colors hover:border-accent hover:text-accent"
                  >
                    <ImagePlus size={20} />
                  </button>
                )}
                <div className="text-xs text-ink-faint">
                  {uploadLogo.isPending ? (
                    "Wird hochgeladen …"
                  ) : (
                    <>
                      PNG/JPG, erscheint oben links im PDF.
                      {data?.logo_path && (
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          className="ml-1 text-accent hover:underline"
                        >
                          Ersetzen
                        </button>
                      )}
                    </>
                  )}
                </div>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </div>
            </div>

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
            <FormField
              label="E-Mail für Website-Anfragen"
              hint="Bei neuen Anfragen über das Website-Kontaktformular geht eine Benachrichtigung an diese Adresse (nur aktiv, wenn ein Resend-Key hinterlegt ist). Leer = keine Benachrichtigung."
            >
              <Input
                type="email"
                value={form.lead_notify_email}
                onChange={(e) => set("lead_notify_email", e.target.value)}
                placeholder="anfragen@firma.de"
              />
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
