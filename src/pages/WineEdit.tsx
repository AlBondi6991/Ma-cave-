import { ArrowLeft } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import LabelScanner from "../components/LabelScanner";
import { Button, Card, Field, PageTitle, inputClass } from "../components/ui";
import { addWine, newId, updateWine, type WineInput } from "../lib/cellar";
import { APPELLATIONS, COUNTRIES, GRAPES, REGIONS, findAppellation } from "../lib/catalog";
import type { LabelFields } from "../lib/labelScan";
import { update, useCellar } from "../lib/store";
import { COLORS, FORMATS, type Wine, type WineColor } from "../lib/types";

type FormValues = Record<
  | "producer" | "name" | "vintage" | "country" | "region" | "appellation" | "grapes" | "format" | "quantity"
  | "purchasePrice" | "value" | "purchaseDate" | "supplier" | "drinkFrom" | "peak" | "drinkUntil" | "notes",
  string
> & { color: WineColor };

const str = (v: unknown) => (v == null ? "" : String(v));

function toForm(w?: Wine): FormValues {
  return {
    producer: str(w?.producer),
    name: str(w?.name),
    vintage: str(w?.vintage),
    color: w?.color ?? "rouge",
    country: w ? str(w.country) : "France",
    region: str(w?.region),
    appellation: str(w?.appellation),
    grapes: w?.grapes.join(", ") ?? "",
    format: w?.format ?? "75 cl",
    quantity: w ? str(w.quantity) : "1",
    purchasePrice: str(w?.purchasePrice),
    value: str(w?.value),
    purchaseDate: str(w?.purchaseDate),
    supplier: str(w?.supplier),
    drinkFrom: str(w?.drinkFrom),
    peak: str(w?.peak),
    drinkUntil: str(w?.drinkUntil),
    notes: str(w?.notes),
  };
}

const num = (s: string) => {
  const n = Number(s.replace(",", "."));
  return s.trim() === "" || Number.isNaN(n) ? undefined : n;
};
const text = (s: string) => s.trim() || undefined;

function fromForm(f: FormValues): WineInput {
  return {
    producer: f.producer.trim(),
    name: f.name.trim(),
    vintage: num(f.vintage),
    color: f.color,
    country: text(f.country),
    region: text(f.region),
    appellation: text(f.appellation),
    grapes: f.grapes.split(",").map((g) => g.trim()).filter(Boolean),
    format: f.format,
    quantity: Math.max(0, Math.round(num(f.quantity) ?? 0)),
    purchasePrice: num(f.purchasePrice),
    value: num(f.value),
    purchaseDate: text(f.purchaseDate),
    supplier: text(f.supplier),
    drinkFrom: num(f.drinkFrom),
    peak: num(f.peak),
    drinkUntil: num(f.drinkUntil),
    notes: text(f.notes),
  };
}

function validate(f: FormValues): string | undefined {
  if (!f.producer.trim()) return "Indique au moins le domaine ou le château.";
  const years = [f.vintage, f.drinkFrom, f.peak, f.drinkUntil].map(num);
  if (years.some((y) => y != null && (y < 1800 || y > 2200 || !Number.isInteger(y)))) return "Les années doivent être au format AAAA.";
  const [vintage, from, peak, until] = years;
  if (from != null && until != null && from > until) return "« À boire à partir de » doit précéder « jusqu'à ».";
  if (peak != null && ((from != null && peak < from) || (until != null && peak > until))) return "L'apogée doit se situer dans la fenêtre de dégustation.";
  if (vintage != null && from != null && from < vintage) return "La garde ne peut pas commencer avant le millésime.";
}

export default function WineEdit() {
  const { id } = useParams();
  const state = useCellar();
  const navigate = useNavigate();
  const existing = id ? state.wines.find((w) => w.id === id) : undefined;
  const [form, setForm] = useState<FormValues>(() => toForm(existing));
  const [error, setError] = useState<string>();

  if (id && !existing) return <p>Ce vin n'existe plus. <Link className="text-wine-700 underline" to="/vins">Retour à la liste</Link></p>;

  const set = <K extends keyof FormValues>(k: K) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  /** Reporte dans le formulaire ce que le scan a lu ; renvoie le nombre de champs remplis. */
  function applyScan(fields: LabelFields): number {
    const patch: Partial<FormValues> = {};
    for (const [k, v] of Object.entries(fields) as [keyof LabelFields, LabelFields[keyof LabelFields]][]) {
      if (v == null) continue;
      if (k === "color") patch.color = v as FormValues["color"];
      else patch[k] = Array.isArray(v) ? v.join(", ") : String(v);
    }
    const known = findAppellation(fields.appellation);
    if (known && !fields.region) patch.region = known.region;
    setForm((f) => ({ ...f, ...patch }));
    setError(undefined);
    return Object.keys(patch).length;
  }

  function setAppellation(e: { target: { value: string } }) {
    const value = e.target.value;
    const known = findAppellation(value);
    setForm((f) => ({
      ...f,
      appellation: value,
      region: f.region || !known ? f.region : known.region,
    }));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const err = validate(form);
    if (err) return setError(err);
    const values = fromForm(form);
    if (existing) {
      update(updateWine, { ...existing, ...values });
      navigate(`/vins/${existing.id}`);
    } else {
      const wineId = newId();
      update(addWine, values, wineId);
      navigate(`/vins/${wineId}`, { replace: true });
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Link to={existing ? `/vins/${existing.id}` : "/vins"} className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-wine-700">
        <ArrowLeft size={16} /> Retour
      </Link>
      <PageTitle title={existing ? "Modifier le vin" : "Ajouter un vin"} />

      {!existing && <LabelScanner onRead={applyScan} />}

      <Card className="space-y-4">
        <h2 className="font-serif text-lg font-semibold">Le vin</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Domaine / Château *">
            <input className={inputClass} value={form.producer} onChange={set("producer")} placeholder="Château Montrose" />
          </Field>
          <Field label="Cuvée">
            <input className={inputClass} value={form.name} onChange={set("name")} placeholder="Grand vin" />
          </Field>
          <Field label="Millésime" hint="Laisse vide pour un non-millésimé.">
            <input className={inputClass} inputMode="numeric" value={form.vintage} onChange={set("vintage")} placeholder="2016" />
          </Field>
          <Field label="Format">
            <select className={inputClass} value={form.format} onChange={set("format")}>
              {FORMATS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </Field>
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-medium text-stone-700">Couleur</span>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                type="button"
                key={c.value}
                onClick={() => setForm((f) => ({ ...f, color: c.value }))}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ring-1 transition ${
                  form.color === c.value ? "bg-wine-50 font-medium text-wine-800 ring-wine-500" : "bg-white text-stone-700 ring-stone-300"
                }`}
              >
                <span className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ background: c.hex }} />
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Pays">
            <input className={inputClass} list="countries" value={form.country} onChange={set("country")} />
          </Field>
          <Field label="Région">
            <input className={inputClass} list="regions" value={form.region} onChange={set("region")} placeholder="Bordeaux" />
          </Field>
          <Field label="Appellation">
            <input className={inputClass} list="appellations" value={form.appellation} onChange={setAppellation} placeholder="Saint-Estèphe" />
          </Field>
        </div>
        <Field label="Cépages" hint="Séparés par des virgules.">
          <input className={inputClass} list="grapes" value={form.grapes} onChange={set("grapes")} placeholder="Cabernet sauvignon, Merlot" />
        </Field>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-serif text-lg font-semibold">Achat et stock</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {!existing && (
            <Field label="Nombre de bouteilles">
              <input className={inputClass} type="number" min={0} value={form.quantity} onChange={set("quantity")} />
            </Field>
          )}
          <Field label="Prix d'achat (€ / btl)">
            <input className={inputClass} inputMode="decimal" value={form.purchasePrice} onChange={set("purchasePrice")} />
          </Field>
          <Field label="Valeur estimée (€ / btl)" hint="Sinon le prix d'achat est utilisé.">
            <input className={inputClass} inputMode="decimal" value={form.value} onChange={set("value")} />
          </Field>
          <Field label="Date d'achat">
            <input className={inputClass} type="date" value={form.purchaseDate} onChange={set("purchaseDate")} />
          </Field>
          <Field label="Fournisseur">
            <input className={inputClass} value={form.supplier} onChange={set("supplier")} placeholder="Caviste, domaine…" />
          </Field>
        </div>
        {existing && <p className="text-sm text-stone-500">Le stock se gère depuis la fiche du vin (ajout / sortie de bouteilles).</p>}
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="font-serif text-lg font-semibold">Garde</h2>
          <p className="text-sm text-stone-500">Les années servent à calculer quand ouvrir tes bouteilles.</p>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <Field label="À boire dès">
            <input className={inputClass} inputMode="numeric" value={form.drinkFrom} onChange={set("drinkFrom")} placeholder="2024" />
          </Field>
          <Field label="Apogée">
            <input className={inputClass} inputMode="numeric" value={form.peak} onChange={set("peak")} placeholder="2030" />
          </Field>
          <Field label="Jusqu'à">
            <input className={inputClass} inputMode="numeric" value={form.drinkUntil} onChange={set("drinkUntil")} placeholder="2040" />
          </Field>
        </div>
        <Field label="Notes">
          <textarea className={inputClass} rows={3} value={form.notes} onChange={set("notes")} />
        </Field>
      </Card>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate(-1)}>Annuler</Button>
        <Button type="submit">{existing ? "Enregistrer" : "Ajouter à ma cave"}</Button>
      </div>

      <datalist id="regions">{REGIONS.map((r) => <option key={r} value={r} />)}</datalist>
      <datalist id="countries">{COUNTRIES.map((r) => <option key={r} value={r} />)}</datalist>
      <datalist id="appellations">{APPELLATIONS.map((a) => <option key={a.name} value={a.name} />)}</datalist>
      <datalist id="grapes">{GRAPES.map((r) => <option key={r} value={r} />)}</datalist>
    </form>
  );
}
