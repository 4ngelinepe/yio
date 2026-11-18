/**
 * Distrito de un punto de Lima y Callao, calculado en el teléfono con los límites del IGN
 * (el buscador no trae el distrito para Lima). Los límites se descargan solo la primera vez que se buscan.
 */
type Data = { source: string; d: { n: string; r: [number, number][][] }[] };
let data: Promise<Data> | null = null;
const load = () => (data ??= import("../data/districts.json").then((m) => m.default as unknown as Data));

function inside(lng: number, lat: number, ring: [number, number][]) {
  let ok = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) ok = !ok;
  }
  return ok;
}

export async function districtOf(lat: number, lng: number): Promise<string | null> {
  try {
    const { d } = await load();
    for (const x of d) if (x.r.some((ring) => inside(lng, lat, ring))) return x.n;
  } catch { /* sin distrito */ }
  return null;
}

/** "Calle · Distrito": quita "Lima"/"Perú" sueltos y repeticiones. */
export async function withDistrict<T extends { name: string; detail: string; lat: number; lng: number; street?: string }>(places: T[]): Promise<T[]> {
  return Promise.all(places.map(async (p) => {
    const dist = await districtOf(p.lat, p.lng);
    const street = p.street?.trim();
    const parts = [street && street !== p.name ? street : null, dist ?? p.detail]
      .filter((x): x is string => !!x && !/^(lima|perú|peru)$/i.test(x));
    return { ...p, detail: parts.length ? [...new Set(parts)].join(" · ") : p.detail };
  }));
}
