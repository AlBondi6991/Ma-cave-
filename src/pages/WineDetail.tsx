import { ArrowLeft, Grid3x3, Minus, NotebookPen, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AddBottlesDialog, RemoveBottleDialog, TastingDialog } from "../components/StockDialogs";
import { Button, Card, ColorDot, Rating, StatusBadge } from "../components/ui";
import { deleteTasting, deleteWine, slotsOf } from "../lib/cellar";
import { formatDate, formatEuro, plural, slotLabel } from "../lib/format";
import { averageRating, bottleValue } from "../lib/stats";
import { drinkStatus } from "../lib/status";
import { update, useCellar } from "../lib/store";
import { COLORS, EXIT_REASONS, type Wine } from "../lib/types";

export default function WineDetail() {
  const { id } = useParams();
  const state = useCellar();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<"add" | "remove" | "tasting" | null>(null);
  const wine = state.wines.find((w) => w.id === id);

  if (!wine) {
    return (
      <p>
        Ce vin n'existe plus.{" "}
        <Link className="text-wine-700 underline" to="/vins">Retour à la liste</Link>
      </p>
    );
  }

  const slots = slotsOf(state, wine.id);
  const tastings = state.tastings.filter((t) => t.wineId === wine.id).sort((a, b) => b.date.localeCompare(a.date));
  const movements = state.movements.filter((m) => m.wineId === wine.id).sort((a, b) => b.date.localeCompare(a.date));
  const avg = averageRating(state, wine.id);
  const value = bottleValue(wine);
  const color = COLORS.find((c) => c.value === wine.color)!;

  function remove() {
    if (!confirm(`Supprimer « ${wine!.producer} » et tout son historique ?`)) return;
    update(deleteWine, wine!.id);
    navigate("/vins", { replace: true });
  }

  return (
    <div className="space-y-4">
      <Link to="/vins" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-wine-700">
        <ArrowLeft size={16} /> Mes vins
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <ColorDot color={wine.color} /> {color.label} · {wine.format}
          </div>
          <h1 className="mt-1 font-serif text-3xl font-semibold text-wine-900">
            {wine.producer} <span className="text-wine-600">{wine.vintage ?? "NM"}</span>
          </h1>
          {wine.name && <p className="text-lg text-stone-700">{wine.name}</p>}
          <p className="text-sm text-stone-500">{[wine.appellation, wine.region, wine.country].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/vins/${wine.id}/modifier`}>
            <Button variant="secondary"><Pencil size={16} /> Modifier</Button>
          </Link>
          <Button variant="danger" onClick={remove} aria-label="Supprimer"><Trash2 size={16} /></Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-stone-500">En cave</div>
              <div className="font-serif text-4xl font-semibold text-wine-900">{wine.quantity}</div>
              <div className="text-sm text-stone-500">
                {value != null ? `${formatEuro(value, true)} / btl · ${formatEuro(value * wine.quantity)}` : "Valeur non renseignée"}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={() => setDialog("remove")} disabled={wine.quantity === 0}><Minus size={16} /> Sortir</Button>
              <Button variant="secondary" onClick={() => setDialog("add")}><Plus size={16} /> Ajouter</Button>
            </div>
          </div>
          <div className="mt-4 border-t border-stone-100 pt-3 text-sm">
            <div className="mb-1.5 flex items-center gap-1.5 font-medium text-stone-700"><Grid3x3 size={15} /> Emplacements</div>
            {slots.length === 0 ? (
              <p className="text-stone-500">Aucune bouteille rangée dans un casier.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {slots.map((s) => {
                  const rack = state.racks.find((r) => r.id === s.rackId);
                  return (
                    <Link key={`${s.rackId}-${s.row}-${s.col}`} to={`/cave?casier=${s.rackId}&vin=${wine.id}`} className="rounded-md bg-stone-100 px-2 py-0.5 text-stone-700 hover:bg-wine-50">
                      {rack?.name} · {slotLabel(s.row, s.col)}
                    </Link>
                  );
                })}
              </div>
            )}
            {wine.quantity > slots.length && (
              <p className="mt-1.5 text-stone-500">
                {plural(wine.quantity - slots.length, "bouteille")} hors casier ·{" "}
                <Link to="/cave" className="text-wine-700 underline">ranger</Link>
              </p>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium uppercase tracking-wide text-stone-500">Garde</div>
            <StatusBadge status={drinkStatus(wine)} />
          </div>
          <DrinkWindow wine={wine} />
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Info label="Cépages" value={wine.grapes.join(", ")} />
            <Info label="Prix d'achat" value={wine.purchasePrice != null ? formatEuro(wine.purchasePrice, true) : undefined} />
            <Info label="Acheté le" value={wine.purchaseDate ? formatDate(wine.purchaseDate) : undefined} />
            <Info label="Fournisseur" value={wine.supplier} />
          </dl>
          {wine.notes && <p className="mt-3 whitespace-pre-line rounded-lg bg-stone-50 p-2.5 text-sm text-stone-700">{wine.notes}</p>}
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
            Dégustations {avg != null && <Rating value={Math.round(avg * 10) / 10} />}
          </h2>
          <Button variant="secondary" onClick={() => setDialog("tasting")}><NotebookPen size={16} /> Noter</Button>
        </div>
        {tastings.length === 0 ? (
          <p className="text-sm text-stone-500">Pas encore de note de dégustation.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {tastings.map((t) => (
              <li key={t.id} className="py-2.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-medium text-stone-800">{formatDate(t.date)} <Rating value={t.rating} /></span>
                  <button
                    className="text-stone-400 hover:text-red-600"
                    aria-label="Supprimer la note"
                    onClick={() => confirm("Supprimer cette note ?") && update(deleteTasting, t.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <TastingText label="Œil" text={t.eye} />
                <TastingText label="Nez" text={t.nose} />
                <TastingText label="Bouche" text={t.palate} />
                <TastingText label="Accord" text={t.pairing} />
                {t.comment && <p className="mt-0.5 italic text-stone-600">{t.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-2 font-serif text-lg font-semibold">Historique</h2>
        <ul className="divide-y divide-stone-100 text-sm">
          {movements.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2">
              <span className="text-stone-600">{formatDate(m.date)}</span>
              <span className="flex-1 px-3 text-stone-800">
                {m.type === "entree" ? "Entrée" : EXIT_REASONS.find((r) => r.value === m.reason)?.label ?? "Sortie"}
                {m.note && <span className="text-stone-500"> · {m.note}</span>}
              </span>
              <span className={`font-semibold ${m.type === "entree" ? "text-emerald-700" : "text-wine-700"}`}>
                {m.type === "entree" ? "+" : "−"}
                {m.quantity}
              </span>
            </li>
          ))}
          {movements.length === 0 && <li className="py-2 text-stone-500">Aucun mouvement.</li>}
        </ul>
      </Card>

      <AddBottlesDialog wine={wine} open={dialog === "add"} onClose={() => setDialog(null)} />
      <RemoveBottleDialog wine={wine} open={dialog === "remove"} onClose={() => setDialog(null)} />
      <TastingDialog wine={wine} open={dialog === "tasting"} onClose={() => setDialog(null)} />
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-stone-500">{label}</dt>
      <dd className="text-stone-800">{value || "—"}</dd>
    </div>
  );
}

function TastingText({ label, text }: { label: string; text?: string }) {
  if (!text) return null;
  return (
    <p className="mt-0.5 text-stone-700">
      <span className="text-stone-500">{label} : </span>
      {text}
    </p>
  );
}

/** Frise de la fenêtre de dégustation avec un repère sur l'année en cours. */
function DrinkWindow({ wine }: { wine: Wine }) {
  const { drinkFrom, peak, drinkUntil } = wine;
  const known = [drinkFrom, peak, drinkUntil].filter((y): y is number => y != null);
  if (known.length === 0) {
    return <p className="mt-3 text-sm text-stone-500">Renseigne la fenêtre de garde pour être alerté au bon moment.</p>;
  }
  const year = new Date().getFullYear();
  const start = Math.min(...known, year, wine.vintage ?? Infinity) - 1;
  const end = Math.max(...known, year) + 1;
  const pos = (y: number) => `${((y - start) / (end - start)) * 100}%`;
  const from = drinkFrom ?? start;
  const until = drinkUntil ?? end;

  return (
    <div className="mt-4">
      <div className="relative h-3 rounded-full bg-stone-100">
        <div className="absolute inset-y-0 rounded-full bg-lime-200" style={{ left: pos(from), right: `calc(100% - ${pos(until)})` }} />
        {peak != null && (
          <div className="absolute inset-y-0 rounded-full bg-emerald-400" style={{ left: pos(peak - 1), right: `calc(100% - ${pos(peak + 1)})` }} />
        )}
        <div className="absolute -top-1 h-5 w-0.5 bg-wine-700" style={{ left: pos(year) }} title={`Aujourd'hui (${year})`} />
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-stone-500">
        <span>{drinkFrom ? `Dès ${drinkFrom}` : ""}</span>
        <span>{peak ? `Apogée ${peak}` : ""}</span>
        <span>{drinkUntil ? `Jusqu'à ${drinkUntil}` : ""}</span>
      </div>
    </div>
  );
}
