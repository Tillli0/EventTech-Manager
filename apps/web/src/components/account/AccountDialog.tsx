import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Input";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { ThemeAuswahl } from "@/components/account/ThemeAuswahl";
import { PersonalScheduleSection } from "@/components/account/PersonalScheduleSection";

/**
 * Eigenes Konto: jeder eingeloggte Nutzer darf jederzeit seinen Namen und sein
 * Passwort ändern (unabhängig von Rolle/Rechten). Name geht in profiles, das
 * Passwort über die Supabase-Auth-API (kein Admin nötig — es ist das eigene Konto).
 */
export function AccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, profile, refresh } = useAuth();

  const [name, setName] = useState(profile?.full_name ?? "");
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [nameBusy, setNameBusy] = useState(false);

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  async function saveName() {
    if (!user) return;
    setNameBusy(true);
    setNameMsg(null);
    const { error } = await supabase.from("profiles").update({ full_name: name.trim() || null }).eq("id", user.id);
    setNameBusy(false);
    if (error) {
      setNameMsg(`Fehler: ${error.message}`);
      return;
    }
    await refresh();
    setNameMsg("Name gespeichert.");
  }

  async function savePassword() {
    setPwMsg(null);
    if (pw.length < 6) {
      setPwMsg({ ok: false, text: "Passwort muss mindestens 6 Zeichen haben." });
      return;
    }
    if (pw !== pw2) {
      setPwMsg({ ok: false, text: "Die Passwörter stimmen nicht überein." });
      return;
    }
    setPwBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setPwBusy(false);
    if (error) {
      setPwMsg({ ok: false, text: `Fehler: ${error.message}` });
      return;
    }
    setPw("");
    setPw2("");
    setPwMsg({ ok: true, text: "Passwort geändert." });
  }

  return (
    <Dialog open={open} onClose={onClose} title="Mein Konto">
      <div className="space-y-6">
        {/* Name */}
        <div className="space-y-2">
          <FormField label="Anzeigename">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dein Name" />
          </FormField>
          {user?.email && <p className="text-xs text-ink-faint">Angemeldet als {user.email}</p>}
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={saveName} disabled={nameBusy}>
              {nameBusy ? "Speichert …" : "Name speichern"}
            </Button>
            {nameMsg && <span className="text-xs text-ink-muted">{nameMsg}</span>}
          </div>
        </div>

        {/* Passwort */}
        <div className="space-y-2 border-t border-border pt-5">
          <p className="text-sm font-medium text-ink">Passwort ändern</p>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Neues Passwort">
              <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="mind. 6 Zeichen" />
            </FormField>
            <FormField label="Wiederholen">
              <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            </FormField>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={savePassword} disabled={pwBusy || !pw}>
              {pwBusy ? "Speichert …" : "Passwort ändern"}
            </Button>
            {pwMsg && (
              <span className={pwMsg.ok ? "text-xs text-status-verfuegbar" : "text-xs text-status-defekt"}>
                {pwMsg.text}
              </span>
            )}
          </div>
        </div>

        <ThemeAuswahl />

        <PersonalScheduleSection />

        <div className="flex justify-end border-t border-border pt-4">
          <Button variant="secondary" onClick={onClose}>Schließen</Button>
        </div>
      </div>
    </Dialog>
  );
}
