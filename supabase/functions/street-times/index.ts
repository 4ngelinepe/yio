// YIO · Tiempos reales por calles, a pie y en bici (OpenRouteService, OpenStreetMap)
// Supabase → Edge Functions → Deploy a new function → Via Editor
// Nombre de la función: street-times
// Importante:
//   1. Desactivar "Verify JWT" (la web la llama sin sesión).
//   2. Guardar la clave en Edge Functions → Secrets con el nombre ORS_KEY (nunca en el código ni en la app).
//
// Uso: GET ?from=lat,lng&to=lat,lng
// Respuesta: { walk: { m, s, path } | null, bike: { m, s, path } | null }
//   m = metros, s = segundos, path = [[lat, lng], …] simplificado (un punto cada ~25 m).
// API: api.heigit.org/openrouteservice (la dirección vieja api.openrouteservice.org está deprecada).
// Plan gratis de ORS: 2.000 rutas/día. Se guarda cada tramo 24 h en memoria para no gastar de más.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "public, max-age=86400" },
  });

type Leg = { m: number; s: number; path: [number, number][] } | null;
const cache = new Map<string, { t: number; walk: Leg; bike: Leg }>();
const DAY = 86_400_000;

/** Solo Lima Metropolitana y Callao. */
function parse(v: string | null): [number, number] | null {
  const m = /^(-?\d{1,2}\.\d{3,7}),(-?\d{2,3}\.\d{3,7})$/.exec(v ?? "");
  if (!m) return null;
  const lat = Number(m[1]), lng = Number(m[2]);
  if (lat < -12.6 || lat > -11.5 || lng < -77.3 || lng > -76.6) return null;
  return [lat, lng];
}


/** [[lng, lat], …] → [[lat, lng], …] con un punto cada ~25 m y 5 decimales (≈1 m). */
function simplify(coords: [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  let last: [number, number] | null = null;
  for (let i = 0; i < coords.length; i++) {
    const [lng, lat] = coords[i];
    const p: [number, number] = [Number(lat.toFixed(5)), Number(lng.toFixed(5))];
    const isEnd = i === coords.length - 1;
    if (!last || isEnd || Math.hypot((p[0] - last[0]) * 111_000, (p[1] - last[1]) * 108_000) >= 25) {
      out.push(p);
      last = p;
    }
  }
  return out;
}

async function route(profile: "foot-walking" | "cycling-regular", a: [number, number], b: [number, number], key: string): Promise<Leg> {
  try {
    // Dirección vigente de HeiGIT (api.openrouteservice.org está deprecada y con cupo reducido).
    const r = await fetch(`https://api.heigit.org/openrouteservice/v2/directions/${profile}/geojson`, {
      method: "POST",
      headers: { Authorization: key, "Content-Type": "application/json", Accept: "application/geo+json" },
      body: JSON.stringify({ coordinates: [[a[1], a[0]], [b[1], b[0]]] }),
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return null;
    const d = await r.json();
    const f = d?.features?.[0];
    const sum = f?.properties?.summary;
    if (!sum || typeof sum.distance !== "number") return null;
    return { m: Math.round(sum.distance), s: Math.round(sum.duration), path: simplify(f?.geometry?.coordinates ?? []) };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET") return json({ error: "Solo GET" }, 405);

  const key = Deno.env.get("ORS_KEY");
  if (!key) return json({ error: "Falta el secreto ORS_KEY" }, 500);

  const q = new URL(req.url).searchParams;
  const a = parse(q.get("from")), b = parse(q.get("to"));
  if (!a || !b) return json({ error: "Coordenadas inválidas o fuera de Lima" }, 400);

  const id = [a, b].map((p) => p.map((x) => x.toFixed(4)).join(",")).join("|");
  const hit = cache.get(id);
  if (hit && Date.now() - hit.t < DAY) return json({ walk: hit.walk, bike: hit.bike });

  const [walk, bike] = await Promise.all([route("foot-walking", a, b, key), route("cycling-regular", a, b, key)]);
  if (walk || bike) cache.set(id, { t: Date.now(), walk, bike });
  return json({ walk, bike }, walk || bike ? 200 : 502);
});
