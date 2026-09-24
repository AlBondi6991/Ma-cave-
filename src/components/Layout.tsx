import { BarChart3, Grid3x3, Home, NotebookPen, Settings, UtensilsCrossed, Wine } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { ConfirmHost } from "./Confirm";

const NAV = [
  { to: "/", label: "Accueil", short: "Accueil", icon: Home, end: true },
  { to: "/vins", label: "Mes vins", short: "Vins", icon: Wine },
  { to: "/cave", label: "Plan de cave", short: "Cave", icon: Grid3x3 },
  { to: "/accords", label: "Accords mets-vins", short: "Accords", icon: UtensilsCrossed },
  { to: "/degustations", label: "Dégustations", short: "Dégust.", icon: NotebookPen },
  { to: "/stats", label: "Statistiques", short: "Stats", icon: BarChart3 },
];

export default function Layout() {
  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col bg-wine-900 px-3 py-6 text-wine-100 md:flex">
        <Brand />
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? "bg-white/15 text-white" : "hover:bg-white/10"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <NavLink
          to="/reglages"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${isActive ? "bg-white/15 text-white" : "hover:bg-white/10"}`
          }
        >
          <Settings size={18} /> Réglages
        </NavLink>
      </aside>

      <header className="sticky top-0 z-10 flex items-center justify-between bg-wine-900 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white md:hidden">
        <Brand />
        <NavLink to="/reglages" className="rounded-lg p-1.5 hover:bg-white/10" aria-label="Réglages">
          <Settings size={20} />
        </NavLink>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 md:px-8 md:pb-10 md:pt-8">
        <Outlet />
      </main>
      <ConfirmHost />

      <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-6 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.map(({ to, short, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium ${isActive ? "text-wine-700" : "text-stone-500"}`
            }
          >
            <Icon size={20} />
            {short}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2 px-2">
      <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="h-8 w-8" />
      <span className="font-serif text-xl font-semibold tracking-tight text-white">Ma Cave</span>
    </div>
  );
}
