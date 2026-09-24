import { useState } from "react";
import { addBottles, addTasting, removeBottles, today, wineLabel } from "../lib/cellar";
import { update } from "../lib/store";
import { EXIT_REASONS, type ExitReason, type Slot, type Wine } from "../lib/types";
import TastingFields, { emptyTasting, hasTasting, tastingFromValues } from "./TastingFields";
import { Button, Field, Modal, inputClass } from "./ui";

export function RemoveBottleDialog({
  wine,
  from,
  open,
  onClose,
}: {
  wine: Wine;
  from?: Pick<Slot, "rackId" | "row" | "col">;
  open: boolean;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState<ExitReason>("bu");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [tasting, setTasting] = useState(emptyTasting());
  const [withTasting, setWithTasting] = useState(false);

  function confirm() {
    update(removeBottles, wine.id, quantity, { reason, date, note: note.trim() || undefined, from });
    if (reason === "bu" && withTasting && hasTasting(tasting)) {
      update(addTasting, { wineId: wine.id, date, ...tastingFromValues(tasting) });
    }
    setQuantity(1);
    setNote("");
    setTasting(emptyTasting());
    setWithTasting(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Sortir une bouteille">
      <p className="mb-4 text-sm text-stone-600">{wineLabel(wine)}</p>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {EXIT_REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setReason(r.value)}
              className={`rounded-full px-3 py-1.5 text-sm ring-1 ${
                reason === r.value ? "bg-wine-700 text-white ring-wine-700" : "bg-white text-stone-700 ring-stone-300"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bouteilles">
            <input
              className={inputClass}
              type="number"
              min={1}
              max={wine.quantity}
              value={quantity}
              disabled={!!from}
              onChange={(e) => setQuantity(Math.min(wine.quantity, Math.max(1, Number(e.target.value) || 1)))}
            />
          </Field>
          <Field label="Date">
            <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Note (occasion, destinataire…)">
          <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {reason === "bu" && (
          <div className="rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200">
            <label className="flex items-center gap-2 text-sm font-medium text-stone-800">
              <input type="checkbox" className="h-4 w-4 accent-wine-700" checked={withTasting} onChange={(e) => setWithTasting(e.target.checked)} />
              Ajouter une note de dégustation
            </label>
            {withTasting && <div className="mt-3"><TastingFields value={tasting} onChange={setTasting} /></div>}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button onClick={confirm}>Valider la sortie</Button>
        </div>
      </div>
    </Modal>
  );
}

export function AddBottlesDialog({ wine, open, onClose }: { wine: Wine; open: boolean; onClose: () => void }) {
  const [quantity, setQuantity] = useState(1);
  const [date, setDate] = useState(today());
  return (
    <Modal open={open} onClose={onClose} title="Ajouter des bouteilles">
      <p className="mb-4 text-sm text-stone-600">{wineLabel(wine)}</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Bouteilles">
          <input className={inputClass} type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))} />
        </Field>
        <Field label="Date">
          <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button
          onClick={() => {
            update(addBottles, wine.id, quantity, date);
            setQuantity(1);
            onClose();
          }}
        >
          Ajouter
        </Button>
      </div>
    </Modal>
  );
}

export function TastingDialog({ wine, open, onClose }: { wine: Wine; open: boolean; onClose: () => void }) {
  const [date, setDate] = useState(today());
  const [values, setValues] = useState(emptyTasting());
  return (
    <Modal open={open} onClose={onClose} title="Note de dégustation">
      <p className="mb-4 text-sm text-stone-600">{wineLabel(wine)}</p>
      <div className="space-y-3">
        <Field label="Date">
          <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <TastingFields value={values} onChange={setValues} />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button
          disabled={!hasTasting(values)}
          onClick={() => {
            update(addTasting, { wineId: wine.id, date, ...tastingFromValues(values) });
            setValues(emptyTasting());
            onClose();
          }}
        >
          Enregistrer
        </Button>
      </div>
    </Modal>
  );
}
