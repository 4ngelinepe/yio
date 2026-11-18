// YIO · Buscador de lugares en Lima (HeiGIT Pelias, datos de OpenStreetMap y otras fuentes abiertas)
// Supabase → Edge Functions → Deploy a new function → Via Editor
// Nombre de la función: places
// Importante:
//   1. Desactivar "Verify JWT" (la web la llama sin sesión).
//   2. Usa el mismo secreto ORS_KEY que street-times (ya existe; no hay que crear otro).
//
// Uso:
//   GET ?q=texto&mode=auto     → sugerencias mientras se escribe (autocompletar)
//   GET ?q=texto&mode=search   → búsqueda completa (al presionar buscar)
// Respuesta: { places: [{ name, detail, lat, lng }] }  (máximo 6, solo Lima y Callao)
// API: api.heigit.org/pelias/v1 (antes api.openrouteservice.org/geocode).
// Plan gratis: 1.000 búsquedas y 1.000 autocompletados al día. Cada texto se guarda 24 h en memoria.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": status === 200 ? "public, max-age=86400" : "no-store" },
  });

type Place = { name: string; detail: string; lat: number; lng: number; street?: string };
const cache = new Map<string, { t: number; places: Place[] }>();
const DAY = 86_400_000;

// Lima Metropolitana y Callao
const BOX = { minLon: -77.25, maxLon: -76.75, minLat: -12.45, maxLat: -11.75 };
const FOCUS = { lat: -12.08, lon: -77.03 };

/** Quita comillas sueltas y espacios de más ("Estación \"Angamos" → "Estación Angamos"). */
const clean = (x: string) => {
  const t = x.trim().replace(/\s+/g, " ");
  return (t.match(/"/g) ?? []).length % 2 ? t.replace(/"/g, "").trim() : t;
};

function toPlaces(features: any[]): Place[] {
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const f of features ?? []) {
    const p = f?.properties ?? {};
    const [lng, lat] = f?.geometry?.coordinates ?? [];
    if (typeof lat !== "number" || typeof lng !== "number") continue;
    const name = clean(p.name || "");
    if (!name) continue;
    // Distrito y ciudad: primero de los campos sueltos, si no, de la etiqueta completa ("Larcomar, Miraflores, Lima, Peru").
    const parts = [p.neighbourhood, p.borough, p.localadmin, p.county, p.locality, ...(String(p.label ?? "").split(","))]
      .map((x: unknown) => clean(String(x ?? "")))
      .filter((x: string) => x && x !== name && !/^(peru|perú)$/i.test(x));
    const detail = [...new Set(parts)].slice(0, 2).join(", ");
    const id = `${name}|${lat.toFixed(4)}|${lng.toFixed(4)}`;
    if (seen.has(id)) continue;
    seen.add(id);
    // Calle y número cuando OpenStreetMap los tiene ("Av. Brasil 1234"); el distrito lo pone la app.
    const street = p.street ? clean(`${p.street}${p.housenumber ? " " + p.housenumber : ""}`) : undefined;
    out.push({ name, detail, lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)), ...(street ? { street } : {}) });
  }
  return out.slice(0, 6);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET") return json({ error: "Solo GET" }, 405);

  const key = Deno.env.get("ORS_KEY");
  if (!key) return json({ error: "Falta el secreto ORS_KEY" }, 500);

  const params = new URL(req.url).searchParams;
  const q = (params.get("q") ?? "").trim().replace(/\s+/g, " ");
  const mode = params.get("mode") === "auto" ? "autocomplete" : "search";
  if (q.length < 3 || q.length > 80) return json({ error: "Texto de 3 a 80 caracteres" }, 400);

  const id = `${mode}:${q.toLowerCase()}`;
  const hit = cache.get(id);
  if (hit && Date.now() - hit.t < DAY) return json({ places: hit.places });

  const url = new URL(`https://api.heigit.org/pelias/v1/${mode}`);
  url.search = new URLSearchParams({
    text: q,
    "boundary.country": "PE",
    "boundary.rect.min_lon": String(BOX.minLon),
    "boundary.rect.max_lon": String(BOX.maxLon),
    "boundary.rect.min_lat": String(BOX.minLat),
    "boundary.rect.max_lat": String(BOX.maxLat),
    "focus.point.lat": String(FOCUS.lat),
    "focus.point.lon": String(FOCUS.lon),
    size: "6",
    lang: "es",
  }).toString();

  try {
    const r = await fetch(url, { headers: { Authorization: key, Accept: "application/json" }, signal: AbortSignal.timeout(5000) });
    if (!r.ok) return json({ error: `Buscador respondió ${r.status}` }, 502);
    const d = await r.json();
    const places = toPlaces(d?.features);
    cache.set(id, { t: Date.now(), places });
    return json({ places });
  } catch {
    return json({ error: "Buscador no disponible" }, 502);
  }
});
