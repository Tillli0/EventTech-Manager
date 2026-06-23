import { useState } from "react";
import { Zap, LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Input";
import { useAuth } from "@/auth/AuthProvider";

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setPending(false);
    if (signInError) {
      setError("Anmeldung fehlgeschlagen. Bitte E-Mail und Passwort prüfen.");
    }
    // Bei Erfolg übernimmt der AuthProvider + Router-Guard die Weiterleitung.
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
            <Zap size={24} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-ink">EventTech Manager</p>
            <p className="text-sm text-ink-muted">Bitte anmelden, um fortzufahren.</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border border-border bg-bg-surface p-6 shadow-sm"
        >
          <FormField label="E-Mail">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@firma.de"
              autoFocus
              required
            />
          </FormField>
          <FormField label="Passwort">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </FormField>

          {error && (
            <div className="rounded-md border border-status-defekt/40 bg-status-defekt/10 px-3 py-2 text-sm text-status-defekt">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            <LogIn size={16} />
            {pending ? "Wird angemeldet …" : "Anmelden"}
          </Button>
        </form>
      </div>
    </div>
  );
}
