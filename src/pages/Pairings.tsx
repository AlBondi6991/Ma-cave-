import { Search, Sparkles, UtensilsCrossed } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button, Card, ColorDot, EmptyState, PageTitle, inputClass } from "../components/ui";
import { wineLabel } from "../lib/cellar";
import { getSample, sampleErrorMessage, type Sample } from "../lib/claude";
import { DISH_GROUPS, DISHES, dishById, idealFor, matchDishes, suggestWines, type Dish } from "../lib/pairing";
import { STATUS_INFO, drinkStatus } from "../lib/status";
import { useCellar } from "../lib/store";
import { COLORS, type CellarState, type Wine } from "../lib/types";

export default function Pairings() {
  const state = useCellar();
  const [params, setParams] = useSearchParams();
  const dishId = params.get("plat");
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [sample, setSample] = useState<Sample | null>(null);

  useEffect(() => {
    getSample().then(setSample);
  }, []);

  const matches = useMemo(() => (dishId ? [] : matchDishes(query)), [query, dishId]);
  const dish = dishById(dishId) ?? matches[0];
  const suggestions = useMemo(() => (dish ? suggestWines(state, dish) : []), [state, dish]);
  const asked = dishId ? dish?.label : query.trim();

  const pick = (d: Dish) => {
    setQuery("");
    setParams({ plat: d.id }, { replace: true });
  };
  const type = (q: string) => {
    setQuery(q);
    setParams(q ? { q } : {}, { replace: true });
  };

  const inStock = state.wines.some((w) => w.quantity > 0);

  return (
    <div className="space-y-4">
      <PageTitle title="Accords mets-vins" subtitle="Dis ce que tu manges, je cherche la bouteille dans ta cave." />

      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          className={`${inputClass} pl-10`}
          placeholder="Magret, huîtres, curry, comté…"
          value={dishId ? dish?.label ?? "" : query}
          onChange={(e) => type(e.target.value)}
          onFocus={() => dishId && type("")}
        />
      </div>

      {!asked && (
        <Card className="space-y-3">
          {DISH_GROUPS.map((g) => (
            <div key={g}>
              <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-stone-500">{g}</div>
              <div className="flex flex-wrap gap-1.5">
                {DISHES.filter((d) => d.group === g).map((d) => (
                  <button key={d.id} onClick={() => pick(d)} className="rounded-full bg-white px-3 py-1 text-sm text-stone-700 ring-1 ring-stone-300 hover:ring-wine-300">
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Card>
      )}

      {asked && !inStock && (
        <EmptyState icon={<UtensilsCrossed size={32} />} title="Ta cave est vide">
          <Link to="/vins/nouveau" className="text-wine-700 underline">Ajoute des bouteilles</Link> pour recevoir des suggestions.
        </EmptyState>
      )}

      {asked && inStock && (
        <>
          {dish ? (
            <Card>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-serif text-lg font-semibold">Avec {dish.label.toLowerCase()}</h2>
                {!dishId && matches.length > 1 && (
                  <div className="flex flex-wrap gap-1 text-xs text-stone-500">
                    Ou :
                    {matches.slice(1, 4).map((d) => (
                      <button key={d.id} className="text-wine-700 underline" onClick={() => pick(d)}>{d.label}</button>
                    ))}
                  </div>
                )}
              </div>
              <p className="mt-0.5 text-sm text-stone-500">Idéalement : {idealFor(dish)}</p>
              {suggestions.length === 0 ? (
                <p className="mt-3 text-sm text-stone-600">Rien de vraiment adapté dans ta cave pour ce plat.</p>
              ) : (
                <ul className="mt-3 divide-y divide-stone-100">
                  {suggestions.map((s, i) => (
                    <PickRow key={s.wine.id} wine={s.wine} best={i === 0} why={s.reasons.join(" · ")} />
                  ))}
                </ul>
              )}
            </Card>
          ) : (
            <p className="text-sm text-stone-600">Je ne reconnais pas ce plat dans ma liste. Choisis-en un proche{sample ? " ou demande à Claude" : ""}.</p>
          )}

          {sample && asked && <AskClaude key={asked} sample={sample} state={state} dish={asked} />}

          <button className="text-sm text-wine-700 underline" onClick={() => type("")}>Choisir un autre plat</button>
        </>
      )}
    </div>
  );
}

function PickRow({ wine, why, best }: { wine: Wine; why: string; best?: boolean }) {
  return (
    <li>
      <Link to={`/vins/${wine.id}`} className="flex items-center gap-3 py-2.5 hover:bg-stone-50">
        <ColorDot color={wine.color} />
        <div className="min-w-0 flex-1">
          {best && <span className="mb-0.5 inline-block rounded bg-wine-700 px-1.5 py-0.5 text-[11px] font-semibold text-white">Mon choix</span>}
          <div className="truncate font-medium text-stone-900">{wineLabel(wine)}</div>
          <div className="text-sm text-stone-500">{why}</div>
        </div>
        <span className="shrink-0 text-sm font-semibold text-wine-700">×{wine.quantity}</span>
      </Link>
    </li>
  );
}

interface ClaudePick {
  id: string;
  why: string;
}

function cellarForPrompt(state: CellarState) {
  const year = new Date().getFullYear();
  return state.wines
    .filter((w) => w.quantity > 0)
    .slice(0, 200)
    .map((w) => {
      const color = COLORS.find((c) => c.value === w.color)!.label;
      const where = [w.appellation, w.region].filter(Boolean).join(", ");
      return `${w.id} | ${wineLabel(w)} | ${color} | ${where || "?"} | ${w.grapes.join(", ") || "?"} | ${STATUS_INFO[drinkStatus(w, year)].label} | ${w.quantity} btl`;
    })
    .join("\n");
}

function AskClaude({ sample, state, dish }: { sample: Sample; state: CellarState; dish: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<{ tip?: string; picks: ClaudePick[] }>();
  const [error, setError] = useState<string>();
  const ctl = useRef<AbortController>(null);

  useEffect(() => () => ctl.current?.abort(), []);

  async function ask() {
    ctl.current?.abort();
    ctl.current = new AbortController();
    setStatus("loading");
    setError(undefined);
    try {
      const raw = await sample.json<{ tip?: unknown; picks?: unknown }>(
        `Tu es sommelier. Je mange : « ${dish} ».
Choisis jusqu'à 3 bouteilles dans ma cave ci-dessous (une par ligne : id | vin | couleur | appellation | cépages | garde | stock).
Privilégie l'accord, puis les bouteilles prêtes ou à boire vite ; évite celles « À garder » sauf s'il n'y a rien d'autre.
Réponds uniquement en JSON : {"tip": "une phrase de conseil général (température, style)", "picks": [{"id": "<id exact>", "why": "pourquoi, en une phrase courte"}]}
Si rien ne convient, "picks" vide et explique dans "tip".

${cellarForPrompt(state)}`,
        { signal: ctl.current.signal },
      );
      const ids = new Set(state.wines.map((w) => w.id));
      const picks = Array.isArray(raw?.picks)
        ? (raw.picks as Record<string, unknown>[])
            .filter((p) => typeof p?.id === "string" && ids.has(p.id))
            .map((p) => ({ id: p.id as string, why: typeof p.why === "string" ? p.why.slice(0, 240) : "" }))
            .slice(0, 3)
        : [];
      setResult({ tip: typeof raw?.tip === "string" ? raw.tip.slice(0, 400) : undefined, picks });
      setStatus("done");
    } catch (e) {
      if ((e as { code?: string })?.code === "cancelled") return;
      setError(sampleErrorMessage(e));
      setStatus("error");
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-serif text-lg font-semibold"><Sparkles size={18} className="text-wine-600" /> L'avis de Claude</h2>
        {status !== "loading" && (
          <Button variant={status === "done" ? "ghost" : "secondary"} onClick={ask}>
            {status === "done" ? "Redemander" : "Demander à Claude"}
          </Button>
        )}
      </div>
      {status === "idle" && <p className="mt-1 text-sm text-stone-500">Claude regarde toute ta cave et choisit pour « {dish} ».</p>}
      {status === "loading" && <p className="mt-2 animate-pulse text-sm text-stone-500">Claude parcourt ta cave…</p>}
      {status === "error" && <p className="mt-2 text-sm text-red-700">{error}</p>}
      {status === "done" && result && (
        <>
          {result.tip && <p className="mt-2 text-sm text-stone-700">{result.tip}</p>}
          <ul className="mt-2 divide-y divide-stone-100">
            {result.picks.map((p) => {
              const wine = state.wines.find((w) => w.id === p.id)!;
              return <PickRow key={p.id} wine={wine} why={p.why} />;
            })}
          </ul>
        </>
      )}
    </Card>
  );
}
