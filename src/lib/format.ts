const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const euroCents = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export function formatEuro(value: number | undefined, cents = false): string {
  if (value == null || Number.isNaN(value)) return "—";
  return (cents ? euroCents : euro).format(value);
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${n} ${n > 1 ? pluralForm : singular}`;
}

/** Colonne de casier en lettre (A, B, … Z, AA). */
export function colLabel(col: number): string {
  let s = "";
  let n = col + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function slotLabel(row: number, col: number): string {
  return `${colLabel(col)}${row + 1}`;
}
