import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

export interface ConfirmOptions {
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** true = Bestätigen-Button als Gefahr (rot) darstellen, z.B. beim Löschen. */
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Promise-basierte Bestätigung als In-App-Dialog (Ersatz für window.confirm). */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm muss innerhalb von <ConfirmProvider> verwendet werden.");
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    setOpts(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback((result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOpts(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={!!opts}
        onClose={() => close(false)}
        title={opts?.title ?? "Bestätigen"}
        maxWidth="max-w-sm"
      >
        <div className="space-y-5">
          <div className="text-sm text-ink-muted">{opts?.message}</div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => close(false)}>
              {opts?.cancelLabel ?? "Abbrechen"}
            </Button>
            <Button variant={opts?.danger ? "danger" : "primary"} onClick={() => close(true)}>
              {opts?.confirmLabel ?? "OK"}
            </Button>
          </div>
        </div>
      </Dialog>
    </ConfirmContext.Provider>
  );
}
