import { Plus, Search, Wine as WineIcon } from "lucide-react";
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import WineRow from "../components/WineRow";
import { Button, EmptyState, PageTitle, Rating, inputClass } from "../components/ui";
import { plural } from "../lib/format";
import { averageRating, bottleValue } from "../lib/stats";
import { STATUS_INFO, drinkStatus, isDrinkable, type DrinkStatus } from "../lib/status";
import { useCellar } from "../lib/store";
import { COLORS, type Wine } from "../lib/types";

const SORTS = {
  producer: { label: "Domaine", fn: (a: Wine, b: Wine) => a.producer.localeCompare(b.producer) },
  vintage: { label: "Millésime", fn: (a: Wine, b: Wine) => (a.vintage ?? 0) - (b.vintage ?? 0) },
  window: {
    label: "À boire en premier",
    fn: (a: Wine, b: Wine) =>
      STATUS_INFO[drinkStatus(a)].order - STATUS_INFO[drinkStatus(b)].order || (a.drinkUntil ?? 9999) - (b.drinkUntil ?? 9999),
  },
  quantity: { label: "Quantité", fn: (a: Wine, b: Wine) => b.quantity - a.quantity },
  value: { label: "Valeur", fn: (a: Wine, b: Wine) => (bottleValue(b) ?? 0) - (bottleValue(a) ?? 0) },
  recent: { label: "Ajout récent", fn: (a: Wine, b: Wine) => b.createdAt.localeCompare(a.createdAt) },
} as const;

type SortKey = keyof typeof SORTS;

const normalize = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export default function WineList() {
  const state = useCellar();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const color = params.get("couleur") ?? "";
  const status = params.get("statut") ?? "";
  const region = params.get("region") ?? "";
  const sort = (params.get("tri") as SortKey) in SORTS ? (params.get("tri") as SortKey) : "producer";
  const showEmpty = params.get("epuises") === "1";

  const setParam = (key: string, value: string) =>
    setParams(
      (p) => {
        if (value) p.set(key, value);
        else p.delete(key);
        return p;
      },
      { replace: true },
    );

  const regions = useMemo(
    () => [...new Set(state.wines.map((w) => w.region).filter(Boolean) as string[])].sort(),
    [state.wines],
  );

  const wines = useMemo(() => {
    const needle = normalize(q.trim());
    return state.wines
      .filter((w) => showEmpty || w.quantity > 0)
      .filter((w) => !color || w.color === color)
      .filter((w) => !region || w.region === region)
      .filter((w) => {
        if (!status) return true;
        const s = drinkStatus(w);
        return status === "boire" ? isDrinkable(s) : s === status;
      })
      .filter(
        (w) =>
          !needle ||
          normalize(
            [w.producer, w.name, w.appellation, w.region, w.country, w.vintage, w.grapes.join(" "), w.supplier].join(" "),
          ).includes(needle),
      )
      .sort(SORTS[sort].fn);
  }, [state.wines, q, color, region, status, sort, showEmpty]);

  const bottles = wines.reduce((n, w) => n + w.quantity, 0);

  return (
    <div>
      <PageTitle
        title="Mes vins"
        subtitle={`${plural(wines.length, "référence")} · ${plural(bottles, "bouteille")}`}
        action={
          <Link to="/vins/nouveau">
            <Button><Plus size={16} /> Ajouter</Button>
          </Link>
        }
      />

      {state.wines.length === 0 ? (
        <EmptyState icon={<WineIcon size={36} />} title="Ta cave est vide">
          <Link to="/vins/nouveau" className="text-wine-700 underline">Ajoute ta première bouteille</Link> ou charge les
          données de démonstration depuis les <Link to="/reglages" className="text-wine-700 underline">réglages</Link>.
        </EmptyState>
      ) : (
        <>
          <div className="mb-3 space-y-2">
            <div className="relative">
              <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                className={`${inputClass} pl-10`}
                placeholder="Domaine, appellation, cépage, millésime…"
                value={q}
                onChange={(e) => setParam("q", e.target.value)}
              />
            </div>
            <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
              <Chip active={!color} onClick={() => setParam("couleur", "")}>Toutes</Chip>
              {COLORS.map((c) => (
                <Chip key={c.value} active={color === c.value} onClick={() => setParam("couleur", color === c.value ? "" : c.value)}>
                  <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style={{ background: c.hex }} />
                  {c.label}
                </Chip>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <select className={inputClass} value={status} onChange={(e) => setParam("statut", e.target.value)}>
                <option value="">Toutes gardes</option>
                <option value="boire">À boire maintenant</option>
                {(Object.keys(STATUS_INFO) as DrinkStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_INFO[s].label}</option>
                ))}
              </select>
              <select className={inputClass} value={region} onChange={(e) => setParam("region", e.target.value)}>
                <option value="">Toutes régions</option>
                {regions.map((r) => <option key={r}>{r}</option>)}
              </select>
              <select className={inputClass} value={sort} onChange={(e) => setParam("tri", e.target.value)}>
                {(Object.keys(SORTS) as SortKey[]).map((k) => (
                  <option key={k} value={k}>Tri : {SORTS[k].label}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 rounded-lg px-1 text-sm text-stone-700">
                <input type="checkbox" className="h-4 w-4 accent-wine-700" checked={showEmpty} onChange={(e) => setParam("epuises", e.target.checked ? "1" : "")} />
                Afficher les épuisés
              </label>
            </div>
          </div>

          {wines.length === 0 ? (
            <EmptyState icon={<Search size={32} />} title="Aucun vin ne correspond à ces filtres" />
          ) : (
            <div className="space-y-2">
              {wines.map((w) => {
                const avg = averageRating(state, w.id);
                return <WineRow key={w.id} wine={w} extra={avg != null && <Rating value={Math.round(avg * 10) / 10} />} />;
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-sm ring-1 transition ${
        active ? "bg-wine-700 text-white ring-wine-700" : "bg-white text-stone-700 ring-stone-300 hover:ring-wine-300"
      }`}
    >
      {children}
    </button>
  );
}
