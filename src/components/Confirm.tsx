import { useSyncExternalStore } from "react";
import { Button, Modal } from "./ui";

/** Confirmation dans l'app : `window.confirm` est bloqué quand l'app est ouverte dans claude.ai. */
interface Request {
  message: string;
  action: string;
  resolve: (ok: boolean) => void;
}

let current: Request | null = null;
const listeners = new Set<() => void>();
const set = (r: Request | null) => {
  current = r;
  listeners.forEach((l) => l());
};

export function ask(message: string, action = "Confirmer"): Promise<boolean> {
  current?.resolve(false);
  return new Promise((resolve) => set({ message, action, resolve }));
}

export function ConfirmHost() {
  const req = useSyncExternalStore(
    (l) => (listeners.add(l), () => void listeners.delete(l)),
    () => current,
  );
  const answer = (ok: boolean) => {
    req?.resolve(ok);
    set(null);
  };
  return (
    <Modal open={!!req} onClose={() => answer(false)} title="Confirmer">
      <p className="text-stone-700">{req?.message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={() => answer(false)}>Annuler</Button>
        <Button variant="danger" onClick={() => answer(true)}>{req?.action}</Button>
      </div>
    </Modal>
  );
}
