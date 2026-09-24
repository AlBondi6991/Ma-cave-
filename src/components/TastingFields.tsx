import { Field, inputClass } from "./ui";

export interface TastingValues {
  rating: string;
  eye: string;
  nose: string;
  palate: string;
  pairing: string;
  comment: string;
}

export const emptyTasting = (): TastingValues => ({ rating: "", eye: "", nose: "", palate: "", pairing: "", comment: "" });

export function hasTasting(v: TastingValues): boolean {
  return Object.values(v).some((x) => x.trim() !== "");
}

export function tastingFromValues(v: TastingValues) {
  const rating = Number(v.rating.replace(",", "."));
  const t = (s: string) => s.trim() || undefined;
  return {
    rating: v.rating.trim() === "" || Number.isNaN(rating) ? undefined : Math.min(20, Math.max(0, rating)),
    eye: t(v.eye),
    nose: t(v.nose),
    palate: t(v.palate),
    pairing: t(v.pairing),
    comment: t(v.comment),
  };
}

export default function TastingFields({ value, onChange }: { value: TastingValues; onChange: (v: TastingValues) => void }) {
  const set = (k: keyof TastingValues) => (e: { target: { value: string } }) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="space-y-3">
      <Field label="Note sur 20">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={20}
            step={0.5}
            value={value.rating || 15}
            onChange={set("rating")}
            className="flex-1 accent-wine-700"
          />
          <input className={`${inputClass} w-20 text-center`} inputMode="decimal" value={value.rating} onChange={set("rating")} placeholder="–" />
        </div>
      </Field>
      <Field label="Œil">
        <input className={inputClass} value={value.eye} onChange={set("eye")} placeholder="Robe grenat, reflets tuilés…" />
      </Field>
      <Field label="Nez">
        <input className={inputClass} value={value.nose} onChange={set("nose")} placeholder="Fruits noirs, sous-bois, épices…" />
      </Field>
      <Field label="Bouche">
        <input className={inputClass} value={value.palate} onChange={set("palate")} placeholder="Tanins fondus, belle longueur…" />
      </Field>
      <Field label="Accord mets-vin">
        <input className={inputClass} value={value.pairing} onChange={set("pairing")} placeholder="Côte de bœuf" />
      </Field>
      <Field label="Commentaire">
        <textarea className={inputClass} rows={2} value={value.comment} onChange={set("comment")} />
      </Field>
    </div>
  );
}
