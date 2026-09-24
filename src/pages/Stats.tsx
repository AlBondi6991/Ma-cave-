import { BarChart3 } from "lucide-react";
import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, EmptyState, PageTitle, Stat } from "../components/ui";
import { formatEuro, plural } from "../lib/format";
import { byColor, byRegion, byVintage, consumptionByMonth, totals } from "../lib/stats";
import { useCellar } from "../lib/store";

const INK = "#78716c";
const GRID = "#e7e5e4";
const BAR = "#8e1b36";

const tooltip = {
  cursor: { fill: "rgba(142, 27, 54, 0.06)" },
  contentStyle: { borderRadius: 10, border: "1px solid #e7e5e4", fontSize: 13 },
  formatter: (v: unknown) => [plural(Number(v), "bouteille"), ""] as [string, string],
  separator: "",
};

export default function Stats() {
  const state = useCellar();
  const t = totals(state);
  const colors = byColor(state);
  const regions = byRegion(state);
  const vintages = byVintage(state);
  const months = consumptionByMonth(state);
  const drunk = months.reduce((n, m) => n + m.bottles, 0);
  const gain = t.value - t.purchase;

  if (t.bottles === 0 && state.movements.length === 0) {
    return (
      <div>
        <PageTitle title="Statistiques" />
        <EmptyState icon={<BarChart3 size={36} />} title="Pas encore de données">Ajoute des vins pour voir la répartition de ta cave.</EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Statistiques" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Bouteilles" value={t.bottles} hint={plural(t.references, "référence")} />
        <Stat label="Valeur estimée" value={formatEuro(t.value)} hint={t.bottles ? `${formatEuro(t.value / t.bottles)} / btl en moyenne` : undefined} />
        <Stat
          label="Plus-value"
          value={t.purchase ? `${gain >= 0 ? "+" : ""}${formatEuro(gain)}` : "—"}
          hint={t.purchase ? `sur ${formatEuro(t.purchase)} d'achat` : "prix d'achat manquants"}
        />
        <Stat label="Bues sur 12 mois" value={drunk} hint={`≈ ${(drunk / 12).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} / mois`} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ChartCard title="Par couleur">
          <ResponsiveContainer width="100%" height={Math.max(140, colors.length * 40)}>
            <BarChart data={colors} layout="vertical" margin={{ left: 8, right: 24 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={96} tickLine={false} axisLine={false} tick={{ fill: INK, fontSize: 13 }} />
              <Tooltip {...tooltip} />
              <Bar dataKey="bottles" radius={[0, 4, 4, 0]} barSize={22}>
                <LabelList dataKey="bottles" position="right" fill={INK} fontSize={12} />
                {colors.map((c) => <Cell key={c.name} fill={c.fill} stroke="#00000022" />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Par région" subtitle={regions.length === 8 ? "8 premières" : undefined}>
          <ResponsiveContainer width="100%" height={Math.max(140, regions.length * 34)}>
            <BarChart data={regions} layout="vertical" margin={{ left: 8, right: 24 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={110} tickLine={false} axisLine={false} tick={{ fill: INK, fontSize: 13 }} />
              <Tooltip {...tooltip} />
              <Bar dataKey="bottles" fill={BAR} radius={[0, 4, 4, 0]} barSize={18}>
                <LabelList dataKey="bottles" position="right" fill={INK} fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Par millésime">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={vintages} margin={{ top: 8, right: 8, left: -24 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: GRID }} tick={{ fill: INK, fontSize: 12 }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: INK, fontSize: 12 }} />
              <Tooltip {...tooltip} />
              <Bar dataKey="bottles" fill={BAR} radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Bouteilles bues par mois" subtitle="12 derniers mois">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={months} margin={{ top: 8, right: 8, left: -24 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: GRID }} tick={{ fill: INK, fontSize: 12 }} minTickGap={4} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: INK, fontSize: 12 }} />
              <Tooltip {...tooltip} />
              <Bar dataKey="bottles" fill={BAR} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Card>
      <h2 className="font-serif text-lg font-semibold">{title}</h2>
      {subtitle && <p className="text-xs text-stone-500">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </Card>
  );
}
