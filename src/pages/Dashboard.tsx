import { AlertTriangle, Grid3x3, Plus, Sparkles, Wine as WineIcon } from "lucide-react";
import { Link } from "react-router-dom";
import WineRow from "../components/WineRow";
import { Button, Card, ColorDot, EmptyState, PageTitle, Stat } from "../components/ui";
import { wineLabel } from "../lib/cellar";
import { formatDate, formatEuro, plural } from "../lib/format";
import { toDrinkNow, totals } from "../lib/stats";
import { drinkStatus } from "../lib/status";
import { useCellar } from "../lib/store";
import { EXIT_REASONS } from "../lib/types";

export default function Dashboard() {
  const state = useCellar();
  const t = totals(state);
  const drinkNow = toDrinkNow(state);
  const past = state.wines.filter((w) => w.quantity > 0 && drinkStatus(w) === "passe");
  const recent = [...state.movements].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  if (state.wines.length === 0) {
    return (
      <div>
        <PageTitle title="Bienvenue dans ta cave" subtitle="Inventaire, plan de cave, garde et dégustations au même endroit." />
        <EmptyState icon={<WineIcon size={40} />} title="Commence par ajouter une bouteille">
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Link to="/vins/nouveau"><Button><Plus size={16} /> Ajouter un vin</Button></Link>
            <Link to="/reglages"><Button variant="secondary"><Sparkles size={16} /> Essayer avec des exemples</Button></Link>
          </div>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="Ma cave"
        subtitle={new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
        action={<Link to="/vins/nouveau"><Button><Plus size={16} /> Ajouter</Button></Link>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Bouteilles" value={t.bottles} hint={plural(t.references, "référence")} />
        <Stat label="Valeur" value={formatEuro(t.value)} hint={t.purchase ? `Achat ${formatEuro(t.purchase)}` : undefined} />
        <Stat label="À boire" value={t.drinkable} hint="dans leur fenêtre" />
        <Stat
          label="Casiers"
          value={t.capacity ? `${Math.round((t.placed / t.capacity) * 100)} %` : "—"}
          hint={t.capacity ? `${t.placed}/${t.capacity} places` : <Link className="underline" to="/cave">créer un casier</Link>}
        />
      </div>

      {past.length > 0 && (
        <Card className="border-l-4 border-l-orange-400">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 shrink-0 text-orange-500" size={20} />
            <div className="text-sm">
              <p className="font-medium text-stone-900">{plural(past.length, "vin a dépassé", "vins ont dépassé")} {past.length > 1 ? "leur" : "sa"} fenêtre de garde</p>
              <p className="text-stone-600">
                {past.slice(0, 3).map((w, i) => (
                  <span key={w.id}>{i > 0 && ", "}<Link className="underline" to={`/vins/${w.id}`}>{wineLabel(w)}</Link></span>
                ))}
                {past.length > 3 && "…"}
              </p>
            </div>
          </div>
        </Card>
      )}

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-serif text-xl font-semibold text-wine-900">À boire maintenant</h2>
          <Link to="/vins?statut=boire&tri=window" className="text-sm text-wine-700 hover:underline">Tout voir</Link>
        </div>
        {drinkNow.length === 0 ? (
          <p className="text-sm text-stone-500">Rien de prêt pour l'instant — ou renseigne les fenêtres de garde de tes vins.</p>
        ) : (
          <div className="space-y-2">{drinkNow.slice(0, 5).map(({ wine }) => <WineRow key={wine.id} wine={wine} />)}</div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-serif text-lg font-semibold">Derniers mouvements</h2>
          <ul className="divide-y divide-stone-100 text-sm">
            {recent.map((m) => {
              const wine = state.wines.find((w) => w.id === m.wineId);
              if (!wine) return null;
              return (
                <li key={m.id} className="flex items-center gap-2 py-2">
                  <ColorDot color={wine.color} />
                  <Link to={`/vins/${wine.id}`} className="min-w-0 flex-1 truncate hover:underline">{wineLabel(wine)}</Link>
                  <span className="shrink-0 text-xs text-stone-500">
                    {m.type === "entree" ? "Entrée" : EXIT_REASONS.find((r) => r.value === m.reason)?.label} · {formatDate(m.date)}
                  </span>
                  <span className={`w-7 shrink-0 text-right font-semibold ${m.type === "entree" ? "text-emerald-700" : "text-wine-700"}`}>
                    {m.type === "entree" ? "+" : "−"}{m.quantity}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
        <Card className="flex flex-col justify-between bg-wine-900 text-wine-100 ring-0">
          <div>
            <Grid3x3 className="mb-2" />
            <h2 className="font-serif text-lg font-semibold text-white">Ton plan de cave</h2>
            <p className="mt-1 text-sm">
              {t.bottles - t.placed > 0
                ? `${plural(t.bottles - t.placed, "bouteille attend", "bouteilles attendent")} d'être rangée${t.bottles - t.placed > 1 ? "s" : ""}.`
                : "Toutes tes bouteilles ont une place."}
            </p>
          </div>
          <Link to="/cave" className="mt-4"><Button variant="secondary">Ouvrir le plan</Button></Link>
        </Card>
      </section>
    </div>
  );
}
