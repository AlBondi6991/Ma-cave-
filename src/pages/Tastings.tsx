import { NotebookPen, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, ColorDot, EmptyState, PageTitle, Rating, inputClass } from "../components/ui";
import { wineLabel } from "../lib/cellar";
import { formatDate, plural } from "../lib/format";
import { useCellar } from "../lib/store";

export default function Tastings() {
  const state = useCellar();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"date" | "rating">("date");

  const items = state.tastings
    .map((t) => ({ t, wine: state.wines.find((w) => w.id === t.wineId) }))
    .filter((x) => x.wine)
    .filter(({ t, wine }) =>
      [wineLabel(wine!), t.nose, t.palate, t.pairing, t.comment].join(" ").toLowerCase().includes(q.trim().toLowerCase()),
    )
    .sort((a, b) => (sort === "date" ? b.t.date.localeCompare(a.t.date) : (b.t.rating ?? -1) - (a.t.rating ?? -1)));

  return (
    <div>
      <PageTitle title="Dégustations" subtitle={plural(state.tastings.length, "note")} />
      {state.tastings.length === 0 ? (
        <EmptyState icon={<NotebookPen size={36} />} title="Aucune note de dégustation">
          Quand tu sors une bouteille « bue », tu peux noter tes impressions. Tu peux aussi noter un vin depuis sa fiche.
        </EmptyState>
      ) : (
        <>
          <div className="mb-3 flex gap-2">
            <div className="relative flex-1">
              <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input className={`${inputClass} pl-10`} placeholder="Vin, arôme, accord…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <select className={`${inputClass} w-auto`} value={sort} onChange={(e) => setSort(e.target.value as "date" | "rating")}>
              <option value="date">Plus récentes</option>
              <option value="rating">Mieux notées</option>
            </select>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {items.map(({ t, wine }) => (
              <Card key={t.id}>
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/vins/${wine!.id}`} className="flex min-w-0 items-center gap-2 font-medium hover:underline">
                    <ColorDot color={wine!.color} /> <span className="truncate">{wineLabel(wine!)}</span>
                  </Link>
                  <Rating value={t.rating} />
                </div>
                <p className="mt-0.5 text-xs text-stone-500">{formatDate(t.date)}</p>
                <div className="mt-2 space-y-0.5 text-sm text-stone-700">
                  {t.eye && <p><span className="text-stone-500">Œil : </span>{t.eye}</p>}
                  {t.nose && <p><span className="text-stone-500">Nez : </span>{t.nose}</p>}
                  {t.palate && <p><span className="text-stone-500">Bouche : </span>{t.palate}</p>}
                  {t.pairing && <p><span className="text-stone-500">Accord : </span>{t.pairing}</p>}
                  {t.comment && <p className="italic">{t.comment}</p>}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
