import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { drinkStatus } from "../lib/status";
import type { Wine } from "../lib/types";
import { ColorDot, StatusBadge } from "./ui";

export default function WineRow({ wine, extra }: { wine: Wine; extra?: React.ReactNode }) {
  const place = [wine.appellation || wine.region, wine.country !== "France" ? wine.country : undefined]
    .filter(Boolean)
    .join(", ");
  return (
    <Link
      to={`/vins/${wine.id}`}
      className="flex items-center gap-3 rounded-xl bg-white px-3.5 py-3 shadow-sm ring-1 ring-stone-200/70 transition hover:ring-wine-200"
    >
      <ColorDot color={wine.color} className="h-9 w-2.5 rounded-full" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate font-medium text-stone-900">{wine.producer}</span>
          <span className="shrink-0 text-sm font-semibold text-wine-700">{wine.vintage ?? "NM"}</span>
        </div>
        <div className="truncate text-sm text-stone-500">{[wine.name, place].filter(Boolean).join(" · ")}</div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={drinkStatus(wine)} />
          {extra}
        </div>
      </div>
      <div className="text-right">
        <div className="font-serif text-xl font-semibold text-stone-900">{wine.quantity}</div>
        <div className="text-[11px] text-stone-500">btl</div>
      </div>
      <ChevronRight size={18} className="shrink-0 text-stone-300" />
    </Link>
  );
}
