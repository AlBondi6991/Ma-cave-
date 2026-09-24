import { ArrowRightLeft, Grid3x3, Pencil, Plus, Trash2, Wine as WineIcon, X } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ask } from "../components/Confirm";
import { RemoveBottleDialog } from "../components/StockDialogs";
import { Button, Card, ColorDot, EmptyState, Field, Modal, PageTitle, StatusBadge, inputClass } from "../components/ui";
import {
  addRack,
  deleteRack,
  moveBottle,
  placeBottle,
  slotAt,
  unplaceBottle,
  unplacedCount,
  updateRack,
  wineLabel,
} from "../lib/cellar";
import { colLabel, plural, slotLabel } from "../lib/format";
import { drinkStatus } from "../lib/status";
import { getState, update, useCellar } from "../lib/store";
import { COLORS, type Rack, type Slot } from "../lib/types";

type Pos = Pick<Slot, "rackId" | "row" | "col">;

export default function Cellar() {
  const state = useCellar();
  const [params, setParams] = useSearchParams();
  const rack = state.racks.find((r) => r.id === params.get("casier")) ?? state.racks[0];
  const highlight = params.get("vin");

  const [rackForm, setRackForm] = useState<Rack | "new" | null>(null);
  const [placingWine, setPlacingWine] = useState<string | null>(null); // vin sélectionné pour rangement rapide
  const [moving, setMoving] = useState<Pos | null>(null);
  const [picker, setPicker] = useState<Pos | null>(null); // case vide cliquée
  const [selected, setSelected] = useState<Pos | null>(null); // case pleine cliquée
  const [removing, setRemoving] = useState<Pos | null>(null);

  const unplaced = useMemo(
    () =>
      state.wines
        .map((w) => ({ wine: w, count: unplacedCount(state, w.id) }))
        .filter((x) => x.count > 0)
        .sort((a, b) => a.wine.producer.localeCompare(b.wine.producer)),
    [state],
  );

  const selectRack = (id: string) =>
    setParams((p) => {
      p.set("casier", id);
      return p;
    });

  function clickCell(row: number, col: number) {
    if (!rack) return;
    const pos = { rackId: rack.id, row, col };
    const slot = slotAt(state, rack.id, row, col);
    if (moving) {
      update(moveBottle, moving, pos);
      setMoving(null);
      return;
    }
    if (slot) return setSelected(pos);
    if (placingWine) {
      update(placeBottle, placingWine, rack.id, row, col);
      if (unplacedCount(state, placingWine) <= 1) setPlacingWine(null);
      return;
    }
    setPicker(pos);
  }

  const selectedSlot = selected && slotAt(state, selected.rackId, selected.row, selected.col);
  const selectedWine = selectedSlot && state.wines.find((w) => w.id === selectedSlot.wineId);
  const removingSlot = removing && slotAt(state, removing.rackId, removing.row, removing.col);
  const removingWine = removingSlot && state.wines.find((w) => w.id === removingSlot.wineId);
  const placingInfo = placingWine ? state.wines.find((w) => w.id === placingWine) : undefined;

  return (
    <div>
      <PageTitle
        title="Plan de cave"
        subtitle={state.racks.length > 0 && `${plural(state.slots.length, "bouteille rangée", "bouteilles rangées")} · ${plural(unplaced.reduce((n, x) => n + x.count, 0), "hors casier", "hors casier")}`}
        action={<Button onClick={() => setRackForm("new")}><Plus size={16} /> Casier</Button>}
      />

      {state.racks.length === 0 ? (
        <EmptyState icon={<Grid3x3 size={36} />} title="Aucun casier pour l'instant">
          Crée un casier (ex. 6 rangées × 8 colonnes) pour placer tes bouteilles et les retrouver en un coup d'œil.
        </EmptyState>
      ) : (
        rack && (
          <div className="space-y-4">
            <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
              {state.racks.map((r) => {
                const used = state.slots.filter((s) => s.rackId === r.id).length;
                return (
                  <button
                    key={r.id}
                    onClick={() => selectRack(r.id)}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-sm ring-1 ${
                      r.id === rack.id ? "bg-wine-700 text-white ring-wine-700" : "bg-white text-stone-700 ring-stone-300"
                    }`}
                  >
                    {r.name} <span className="opacity-70">{used}/{r.rows * r.cols}</span>
                  </button>
                );
              })}
            </div>

            {(placingInfo || moving) && (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-wine-800 px-4 py-2.5 text-sm text-white">
                <span>
                  {moving
                    ? `Touche la case de destination (${slotLabel(moving.row, moving.col)} → ?)`
                    : `Rangement de ${placingInfo!.producer} ${placingInfo!.vintage ?? ""} : touche les cases vides (${unplacedCount(state, placingInfo!.id)} restante${unplacedCount(state, placingInfo!.id) > 1 ? "s" : ""})`}
                </span>
                <button onClick={() => { setMoving(null); setPlacingWine(null); }} className="rounded p-1 hover:bg-white/15" aria-label="Annuler">
                  <X size={18} />
                </button>
              </div>
            )}

            <Card className="p-3">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-serif text-lg font-semibold">{rack.name}</h2>
                <Button variant="ghost" onClick={() => setRackForm(rack)}><Pencil size={15} /> Modifier</Button>
              </div>
              <div className="overflow-x-auto pb-1">
                <div
                  className="grid w-max gap-1 [--cell:2.1rem] sm:[--cell:2.75rem]"
                  style={{ gridTemplateColumns: `1.25rem repeat(${rack.cols}, var(--cell))` }}
                >
                  <span />
                  {Array.from({ length: rack.cols }, (_, c) => (
                    <span key={c} className="text-center text-xs font-medium text-stone-400">{colLabel(c)}</span>
                  ))}
                  {Array.from({ length: rack.rows }, (_, r) => (
                    <Fragment key={r}>
                      <span className="flex items-center justify-center text-xs font-medium text-stone-400">{r + 1}</span>
                      {Array.from({ length: rack.cols }, (_, c) => {
                        const slot = slotAt(state, rack.id, r, c);
                        const wine = slot && state.wines.find((w) => w.id === slot.wineId);
                        const hex = wine && COLORS.find((x) => x.value === wine.color)!.hex;
                        const isMoving = moving && moving.row === r && moving.col === c && moving.rackId === rack.id;
                        const dim = highlight && wine && wine.id !== highlight;
                        return (
                          <button
                            key={c}
                            onClick={() => clickCell(r, c)}
                            title={wine ? `${slotLabel(r, c)} · ${wineLabel(wine)}` : slotLabel(r, c)}
                            className={`flex aspect-square items-center justify-center rounded-full text-[11px] font-semibold transition ${
                              wine
                                ? "text-white shadow-inner ring-2 ring-white/40"
                                : "bg-stone-100 text-stone-300 ring-1 ring-stone-200 hover:bg-wine-50 hover:ring-wine-200"
                            } ${isMoving ? "animate-pulse ring-4 ring-wine-900" : ""} ${dim ? "opacity-25" : ""} ${
                              highlight && wine?.id === highlight ? "ring-4 ring-amber-400" : ""
                            }`}
                            style={wine ? { background: hex, color: wine.color === "blanc" || wine.color === "effervescent" || wine.color === "rose" ? "#44403c" : undefined } : undefined}
                          >
                            {wine ? (wine.vintage ? `'${String(wine.vintage).slice(-2)}` : "NM") : "+"}
                          </button>
                        );
                      })}
                    </Fragment>
                  ))}
                </div>
              </div>
              {highlight && (
                <button onClick={() => setParams((p) => { p.delete("vin"); return p; })} className="mt-2 text-sm text-wine-700 underline">
                  Ne plus surligner ce vin
                </button>
              )}
            </Card>

            <Card>
              <h2 className="mb-1 font-serif text-lg font-semibold">Bouteilles à ranger</h2>
              {unplaced.length === 0 ? (
                <p className="text-sm text-stone-500">Toutes tes bouteilles sont rangées. 👌</p>
              ) : (
                <>
                  <p className="mb-2 text-sm text-stone-500">Choisis un vin puis touche les cases vides pour le ranger.</p>
                  <ul className="divide-y divide-stone-100">
                    {unplaced.map(({ wine, count }) => (
                      <li key={wine.id}>
                        <button
                          onClick={() => { setMoving(null); setPlacingWine(placingWine === wine.id ? null : wine.id); }}
                          className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm ${placingWine === wine.id ? "bg-wine-50" : "hover:bg-stone-50"}`}
                        >
                          <ColorDot color={wine.color} />
                          <span className="min-w-0 flex-1 truncate">{wineLabel(wine)}</span>
                          <span className="shrink-0 font-semibold text-wine-700">×{count}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          </div>
        )
      )}

      {/* Case vide : choisir le vin à y ranger */}
      <Modal open={!!picker} onClose={() => setPicker(null)} title={picker ? `Ranger en ${slotLabel(picker.row, picker.col)}` : ""}>
        {unplaced.length === 0 ? (
          <p className="text-sm text-stone-600">
            Aucune bouteille hors casier. <Link to="/vins/nouveau" className="text-wine-700 underline">Ajouter un vin</Link>
          </p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {unplaced.map(({ wine, count }) => (
              <li key={wine.id}>
                <button
                  className="flex w-full items-center gap-3 px-1 py-2.5 text-left text-sm hover:bg-stone-50"
                  onClick={() => {
                    update(placeBottle, wine.id, picker!.rackId, picker!.row, picker!.col);
                    setPicker(null);
                  }}
                >
                  <ColorDot color={wine.color} />
                  <span className="min-w-0 flex-1 truncate">{wineLabel(wine)}</span>
                  <span className="text-stone-500">×{count}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      {/* Case pleine : actions sur la bouteille */}
      <Modal open={!!selectedWine} onClose={() => setSelected(null)} title={selected ? `Case ${slotLabel(selected.row, selected.col)}` : ""}>
        {selectedWine && selected && (
          <div className="space-y-4">
            <Link to={`/vins/${selectedWine.id}`} className="block rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200 hover:ring-wine-200">
              <div className="flex items-center gap-2 font-medium"><ColorDot color={selectedWine.color} /> {wineLabel(selectedWine)}</div>
              <div className="mt-1 flex items-center gap-2 text-sm text-stone-500">
                <StatusBadge status={drinkStatus(selectedWine)} /> {selectedWine.appellation}
              </div>
            </Link>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => { setRemoving(selected); setSelected(null); }}><WineIcon size={16} /> Sortir</Button>
              <Button variant="secondary" onClick={() => { setPlacingWine(null); setMoving(selected); setSelected(null); }}>
                <ArrowRightLeft size={16} /> Déplacer
              </Button>
              <Button variant="secondary" onClick={() => { update(unplaceBottle, selected.rackId, selected.row, selected.col); setSelected(null); }}>
                Retirer du casier
              </Button>
              <Button variant="ghost" onClick={() => { setParams((p) => { p.set("vin", selectedWine.id); return p; }); setSelected(null); }}>
                Surligner ce vin
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {removingWine && removing && (
        <RemoveBottleDialog wine={removingWine} from={removing} open onClose={() => setRemoving(null)} />
      )}

      {rackForm && (
        <RackDialog
          rack={rackForm === "new" ? undefined : rackForm}
          onClose={() => setRackForm(null)}
          onCreated={() => selectRack(getState().racks.at(-1)!.id)}
        />
      )}
    </div>
  );
}

function RackDialog({ rack, onClose, onCreated }: { rack?: Rack; onClose: () => void; onCreated: () => void }) {
  const state = useCellar();
  const [name, setName] = useState(rack?.name ?? `Casier ${state.racks.length + 1}`);
  const [rows, setRows] = useState(rack?.rows ?? 6);
  const [cols, setCols] = useState(rack?.cols ?? 8);
  const clamp = (n: number) => Math.min(30, Math.max(1, Math.round(n) || 1));
  const lost = rack ? state.slots.filter((s) => s.rackId === rack.id && (s.row >= rows || s.col >= cols)).length : 0;

  return (
    <Modal open onClose={onClose} title={rack ? "Modifier le casier" : "Nouveau casier"}>
      <div className="space-y-3">
        <Field label="Nom">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Rangées">
            <input className={inputClass} type="number" min={1} max={30} value={rows} onChange={(e) => setRows(clamp(Number(e.target.value)))} />
          </Field>
          <Field label="Colonnes">
            <input className={inputClass} type="number" min={1} max={30} value={cols} onChange={(e) => setCols(clamp(Number(e.target.value)))} />
          </Field>
        </div>
        <p className="text-sm text-stone-500">Capacité : {plural(rows * cols, "bouteille")}</p>
        {lost > 0 && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
            {plural(lost, "bouteille")} sortira du plan (elle{lost > 1 ? "s" : ""} restera{lost > 1 ? "nt" : ""} en stock, hors casier).
          </p>
        )}
      </div>
      <div className="mt-5 flex items-center justify-between gap-2">
        {rack ? (
          <Button
            variant="danger"
            onClick={async () => {
              if (!(await ask(`Supprimer « ${rack.name} » ? Les bouteilles restent en stock, hors casier.`, "Supprimer"))) return;
              update(deleteRack, rack.id);
              onClose();
            }}
          >
            <Trash2 size={16} /> Supprimer
          </Button>
        ) : <span />}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button
            disabled={!name.trim()}
            onClick={() => {
              if (rack) update(updateRack, { ...rack, name: name.trim(), rows, cols });
              else {
                update(addRack, { name: name.trim(), rows, cols });
                onCreated();
              }
              onClose();
            }}
          >
            {rack ? "Enregistrer" : "Créer"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
