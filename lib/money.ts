export function centsToBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function parseBRLToCents(value: string | number) {
  if (typeof value === "number") return Math.round(value * 100);
  const cleaned = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}
