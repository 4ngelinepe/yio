/**
 * Redes de transporte de YIO, con un modelo común.
 *
 * - Corredor Rojo (ATU): app.corredorrojo.pe (ubicATUbus), snapshot 10 nov 2026.
 *   272 paraderos, rutas 201/204/206/209 en ida y vuelta. Llegadas en vivo vía rojo-arrivals.
 * - Expreso San Isidro (Municipalidad de San Isidro): zenbus.net, snapshot 11 nov 2026.
 *   76 paraderos, 3 rutas circulares. Gratuito y eléctrico. Sin llegadas en vivo aún.
 *
 * Azul y Morado: sin coordenadas públicas todavía (ver bus-routes.ts y portal ATU).
 */
import rojoRaw from "./rojo.json";
import esiRaw from "./esi.json";

export type NetworkId = "rojo" | "esi";

export type Stop = { id: string; name: string; place: string; lat: number; lng: number };

export type Route = {
  key: string;
  code: string; // "201" | "Ruta 02"
  name: string; // título de la opción de bus: "Corredor Rojo 201"
  dirLabel: string; // "ida" | "vuelta" | "circuito"
  ids: string[];
  loop: boolean; // rutas circulares: se puede seguir pasando el punto de inicio
  primary: boolean; // se usa para agrupar el selector "Desde"
};

export type Network = {
  id: NetworkId;
  name: string;
  short: string;
  fare: number;
  electric: boolean;
  live: boolean;
  source: string;
  stops: Record<string, Stop>;
  routes: Route[];
};

export type Trip = { route: Route; stopIds: string[] };
export type PlaceGroup = { label: string; places: string[] };

/* ───────── Limpieza de nombres ───────── */

const SMALL = new Set(["de", "del", "la", "las", "los", "el", "y", "con"]);
function titleCase(s: string, keepAcronyms = true): string {
  return s
    .split(" ")
    .map((w, i) => {
      if (keepAcronyms && w.length > 1 && w.length <= 4 && w === w.toUpperCase() && /[A-Z]/.test(w)) return w;
      const lw = w.toLowerCase();
      if (i > 0 && SMALL.has(lw)) return lw;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

const ROJO_ALIASES: Record<string, string> = {
  "U. de Lima": "Universidad de Lima", "Univ de Lima": "Universidad de Lima", "Univ de lima": "Universidad de Lima",
  "Vascogadas": "Vascongadas", "Rafael Escado": "Rafael Escardo", "GuardiaCivil": "Guardia Civil",
  "LaMar": "La Mar", "La mar": "La Mar", "Marina&Universitaria": "Marina & Universitaria",
  "Sauces": "Los Sauces", "Molina": "La Molina", "Punta": "La Punta",
  "Haya de la torre": "Haya de la Torre", "Javier Prado(Pershing)": "Pershing", "Faucett-Marina": "Faucett",
};

/** "Arenales OE 206" → "Arenales"; "Los Angeles- EO 209" → "Los Angeles". */
function rojoPlace(name: string): string {
  let n = name
    .replace(/20[1469]/g, " ")
    .replace(/[-\s]*\b(EO|OE2|OE)\b.*$/i, "")
    .replace(/\s*-\s*$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^Calle\.\s*/, "Calle ");
  n = ROJO_ALIASES[n] ?? n;
  return titleCase(n);
}

/** "AV. SALAVERRY CUADRA 29" → "Av. Salaverry cuadra 29"; quita sufijos como " 1.1" de paraderos duplicados. */
function esiPlace(name: string): string {
  let n = name.replace(/\s+/g, " ").trim().replace(/(?<!cuadra)\s+1\.1$/i, "").replace(/cuadra\.\s*/i, "cuadra ").replace(/^AV\./, "Av.");
  if (n === n.toUpperCase()) n = titleCase(n, false).replace(/\bCev\b/, "CEV");
  return n.replace(/\bCEV (\w+)/i, (_m, w: string) => `CEV ${w.charAt(0).toUpperCase()}${w.slice(1).toLowerCase()}`);
}

function buildStops(raw: Record<string, [string, number, number]>, clean: (n: string) => string) {
  return Object.fromEntries(
    Object.entries(raw).map(([id, [name, lat, lng]]) => [id, { id, name, place: clean(name), lat, lng }]),
  ) as Record<string, Stop>;
}

/* ───────── Corredor Rojo ───────── */

const rojoRoutes: Route[] = ["201", "204", "206", "209"].flatMap((code) =>
  (["IDA", "VUELTA"] as const).map((dir) => ({
    key: `rojo-${code}-${dir}`,
    code,
    name: `Corredor Rojo ${code}`,
    dirLabel: dir === "IDA" ? "ida" : "vuelta",
    ids: (rojoRaw.routes as Record<string, string[]>)[`${code}|${dir}`] ?? [],
    loop: false,
    primary: dir === "IDA",
  })),
);

export const ROJO: Network = {
  id: "rojo",
  name: "Corredor Rojo",
  short: "Rojo",
  fare: 2.43,
  electric: false,
  live: true,
  source: "https://app.corredorrojo.pe/",
  stops: buildStops(rojoRaw.stops as unknown as Record<string, [string, number, number]>, rojoPlace),
  routes: rojoRoutes,
};

/* ───────── Expreso San Isidro ───────── */

const esiLines = Object.fromEntries(esiRaw.lines.map((l) => [l.id, l]));
const esiRoutes: Route[] = esiRaw.itineraries.map((it, i) => {
  const line = esiLines[it.line];
  const ids = it.stops[0] === it.stops[it.stops.length - 1] ? it.stops.slice(0, -1) : it.stops;
  const sameLineBefore = esiRaw.itineraries.slice(0, i).some((x) => x.line === it.line);
  return {
    key: `esi-${it.id}`,
    code: line.short,
    name: `Expreso San Isidro · ${line.short}`,
    dirLabel: "circuito",
    ids,
    loop: true,
    primary: !sameLineBefore,
  };
});

export const ESI: Network = {
  id: "esi",
  name: "Expreso San Isidro",
  short: "Expreso SI",
  fare: 0,
  electric: true,
  live: false,
  source: "https://zenbus.net/publicapp/limasanisidromibus77868410",
  stops: buildStops(esiRaw.stops as unknown as Record<string, [string, number, number]>, esiPlace),
  routes: esiRoutes,
};

export const NETWORKS: Network[] = [ROJO, ESI];
export const networkById = (id: NetworkId) => NETWORKS.find((n) => n.id === id)!;

/* ───────── Consultas ───────── */

const placeOf = (net: Network, id: string) => net.stops[id]?.place;
const dedupe = (net: Network, ids: string[]) =>
  [...new Set(ids.map((id) => placeOf(net, id)).filter(Boolean) as string[])];

/** Secuencia recorrible desde el índice i (en circuitos da la vuelta completa). */
const sequenceFrom = (r: Route, i: number) => (r.loop ? [...r.ids.slice(i), ...r.ids.slice(0, i)] : r.ids.slice(i));

/** "Desde": paraderos agrupados por ruta, en el orden en que pasa el bus. */
export function placeGroups(net: Network): PlaceGroup[] {
  return net.routes
    .filter((r) => r.primary)
    .map((r) => {
      const list = dedupe(net, r.ids);
      const label = r.loop
        ? `${net.short} · ${r.code} (circuito)`
        : `${net.short} ${r.code} · ${list[0]} → ${list[list.length - 1]}`;
      return { label, places: list };
    });
}

/** "Hasta": destinos directos desde `from`, agrupados por ruta y sentido, en orden de recorrido. */
export function destinationGroups(net: Network, from: string): PlaceGroup[] {
  const groups: PlaceGroup[] = [];
  const seen = new Set<string>();
  for (const r of net.routes) {
    const i = r.ids.findIndex((id) => placeOf(net, id) === from);
    if (i < 0) continue;
    const after = dedupe(net, sequenceFrom(r, i).slice(1)).filter((p) => p !== from);
    if (!after.length) continue;
    const label = r.loop ? `${net.short} · ${r.code}` : `${net.short} ${r.code} · hacia ${dedupe(net, r.ids).at(-1)}`;
    if (seen.has(label)) continue;
    seen.add(label);
    groups.push({ label, places: after });
  }
  return groups;
}

/** Mejor tramo directo (menos paraderos) entre dos lugares. */
export function findTrip(net: Network, from: string, to: string): Trip | null {
  let best: Trip | null = null;
  for (const r of net.routes) {
    const i = r.ids.findIndex((id) => placeOf(net, id) === from);
    if (i < 0) continue;
    const seq = sequenceFrom(r, i);
    const j = seq.findIndex((id, k) => k > 0 && placeOf(net, id) === to);
    if (j < 0) continue;
    const seg = seq.slice(0, j + 1);
    if (!best || seg.length < best.stopIds.length) best = { route: r, stopIds: seg };
  }
  return best;
}

/** Lugar con paradero más cercano a una coordenada, y su distancia en metros. */
export function nearestPlace(net: Network, lat: number, lng: number): { place: string; meters: number } {
  let best = { place: "", meters: Infinity };
  for (const s of Object.values(net.stops)) {
    const d = distanceM({ lat, lng }, s);
    if (d < best.meters) best = { place: s.place, meters: d };
  }
  return best;
}

/** Distancia en metros entre dos puntos (haversine). */
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Distancia recorrida por el bus siguiendo los paraderos del tramo. */
export function rideDistanceM(net: Network, trip: Trip): number {
  let d = 0;
  for (let k = 1; k < trip.stopIds.length; k++) d += distanceM(net.stops[trip.stopIds[k - 1]], net.stops[trip.stopIds[k]]);
  return d;
}
