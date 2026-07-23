// All weights are stored canonically in kg. This helper handles display/entry conversion.
export type Unit = "kg" | "lb";

export const LB_PER_KG = 2.2046226218;

export function kgToDisplay(kg: number | null | undefined, unit: Unit): number | null {
  if (kg == null || Number.isNaN(kg)) return null;
  const v = unit === "lb" ? kg * LB_PER_KG : kg;
  return Math.round(v * 10) / 10;
}

export function displayToKg(value: number | string, unit: Unit): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return null;
  const kg = unit === "lb" ? n / LB_PER_KG : n;
  return Math.round(kg * 100) / 100;
}

export function formatWeight(kg: number | null | undefined, unit: Unit): string {
  const v = kgToDisplay(kg, unit);
  if (v == null) return "—";
  return `${v} ${unit}`;
}

export function unitLabel(unit: Unit): string {
  return unit === "lb" ? "lb" : "kg";
}

let cached: Unit | null = null;
export function getCachedUnit(): Unit {
  if (cached) return cached;
  if (typeof window !== "undefined") {
    const v = window.localStorage.getItem("strv:unit");
    if (v === "kg" || v === "lb") { cached = v; return v; }
  }
  return "kg";
}
export function setCachedUnit(u: Unit) {
  cached = u;
  if (typeof window !== "undefined") window.localStorage.setItem("strv:unit", u);
}
