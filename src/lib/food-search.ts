// Food search via Open Food Facts (free, no API key required).
// Docs: https://openfoodfacts.github.io/openfoodfacts-server/api/

export type FoodHit = {
  id: string;
  name: string;
  brand?: string;
  serving?: string; // e.g. "100 g" or "1 bar (40 g)"
  calories: number; // per serving shown
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  image?: string;
};

type OFFProduct = {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;
  image_small_url?: string;
  nutriments?: Record<string, number | string | undefined>;
};

function num(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

function toHit(p: OFFProduct): FoodHit | null {
  const name = (p.product_name || "").trim();
  if (!name) return null;
  const n = p.nutriments || {};
  // Prefer per-serving; fall back to per-100g.
  const hasServing =
    n["energy-kcal_serving"] != null ||
    n["proteins_serving"] != null ||
    n["carbohydrates_serving"] != null ||
    n["fat_serving"] != null;
  const suffix = hasServing ? "_serving" : "_100g";
  const serving = hasServing
    ? p.serving_size || "1 serving"
    : "100 g";
  let cals = num(n[`energy-kcal${suffix}`]);
  if (!cals) {
    // Some products only report kJ.
    const kj = num(n[`energy${suffix}`]);
    if (kj) cals = Math.round(kj / 4.184);
  }
  return {
    id: p.code || name,
    name,
    brand: (p.brands || "").split(",")[0]?.trim() || undefined,
    serving,
    calories: Math.round(cals),
    protein_g: Math.round(num(n[`proteins${suffix}`]) * 10) / 10,
    carbs_g: Math.round(num(n[`carbohydrates${suffix}`]) * 10) / 10,
    fat_g: Math.round(num(n[`fat${suffix}`]) * 10) / 10,
    image: p.image_small_url,
  };
}

export async function searchFoods(query: string, signal?: AbortSignal): Promise<FoodHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url =
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}` +
    `&search_simple=1&action=process&json=1&page_size=20` +
    `&fields=code,product_name,brands,serving_size,image_small_url,nutriments`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const json = (await res.json()) as { products?: OFFProduct[] };
  const hits = (json.products ?? [])
    .map(toHit)
    .filter((h): h is FoodHit => !!h && h.calories > 0);
  return hits;
}
