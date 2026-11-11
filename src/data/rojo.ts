/**
 * Corredor Rojo — paraderos y rutas.
 *
 * Fuente: app.corredorrojo.pe (ubicATUbus), snapshot del 10 nov 2026.
 * 272 paraderos con coordenadas y el orden de cada uno en las rutas 201, 204, 206 y 209.
 * Para actualizar: volver a exportar /api/routes/map-data?scope=corredor-rojo al mismo formato.
 */
import raw from "./rojo.json";

export const ROJO_FARE = 2.43;
export const ROJO_SOURCE = "https://app.corredorrojo.pe/";

export type Stop = { id: string; name: string; place: string; lat: number; lng: number };
export type RouteKey = string; // "201|IDA"

const ALIASES: Record<string, string> = {
  "U. de Lima": "Universidad de Lima",
  "Univ de Lima": "Universidad de Lima",
  "Univ de lima": "Universidad de Lima",
  "Vascogadas": "Vascongadas",
  "Rafael Escado": "Rafael Escardo",
  "GuardiaCivil": "Guardia Civil",
  "LaMar": "La Mar",
  "La mar": "La Mar",
  "Marina&Universitaria": "Marina & Universitaria",
  "Sauces": "Los Sauces",
  "Molina": "La Molina",
  "Punta": "La Punta",
  "Paseo de Aguas": "Paseo de Aguas",
  "Honda": "Honda",
  "Banco": "Banco",
  "Haya de la torre": "Haya de la Torre",
  "Javier Prado(Pershing)": "Pershing",
  "Faucett-Marina": "Faucett",
};

/** "Arenales OE 206" → "Arenales"; "Los Angeles- EO 209" → "Los Angeles". */
export function placeName(name: string): string {
  let n = name
    .replace(/20[1469]/g, " ")
    .replace(/[-\s]*\b(EO|OE2|OE)\b.*$/i, "")
    .replace(/\s*-\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  n = n.replace(/^Calle\.\s*/, "Calle ");
  n = ALIASES[n] ?? n;
  return titleCase(n);
}

const SMALL = new Set(["de", "del", "la", "las", "los", "el", "y"]);
function titleCase(s: string): string {
  return s
    .split(" ")
    .map((w, i) => {
      if (w.length > 1 && w === w.toUpperCase()) return w; // PNP, SN, NS
      const lw = w.toLowerCase();
      if (i > 0 && SMALL.has(lw)) return lw;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

export const stops: Record<string, Stop> = Object.fromEntries(
  Object.entries(raw.stops as unknown as Record<string, [string, number, number]>).map(([id, [name, lat, lng]]) => [
    id,
    { id, name, place: placeName(name), lat, lng },
  ]),
);

export const routes = raw.routes as Record<RouteKey, string[]>;

export const routeLabel = (key: RouteKey) => {
  const [code, dir] = key.split("|");
  return `Ruta ${code} · ${dir === "IDA" ? "ida" : "vuelta"}`;
};

/** Todos los lugares (nombres limpios) con al menos un paradero. */
export const places: string[] = [...new Set(Object.values(stops).map((s) => s.place))].sort((a, b) =>
  a.localeCompare(b, "es"),
);

export type Trip = { routeKey: RouteKey; stopIds: string[] };

/** Mejor tramo directo (menos paraderos) entre dos lugares, en cualquier ruta y sentido. */
export function findTrip(from: string, to: string): Trip | null {
  let best: Trip | null = null;
  for (const [key, ids] of Object.entries(routes)) {
    const i = ids.findIndex((id) => stops[id]?.place === from);
    if (i < 0) continue;
    const j = ids.findIndex((id, k) => k > i && stops[id]?.place === to);
    if (j < 0) continue;
    const seg = ids.slice(i, j + 1);
    if (!best || seg.length < best.stopIds.length) best = { routeKey: key, stopIds: seg };
  }
  return best;
}

/** Lugares a los que se llega en bus directo desde `from`. */
export function destinationsFrom(from: string): string[] {
  const set = new Set<string>();
  for (const ids of Object.values(routes)) {
    const i = ids.findIndex((id) => stops[id]?.place === from);
    if (i < 0) continue;
    ids.slice(i + 1).forEach((id) => stops[id] && set.add(stops[id].place));
  }
  set.delete(from);
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

export type PlaceGroup = { label: string; places: string[] };

const dedupe = (ids: string[]) => [...new Set(ids.map((id) => stops[id]?.place).filter(Boolean) as string[])];
const ROUTE_ORDER = ["201", "204", "206", "209"];

/** "Desde": paraderos agrupados por ruta, en el orden en que pasa el bus (sentido ida). */
export const placeGroups: PlaceGroup[] = ROUTE_ORDER.map((code) => {
  const ids = routes[`${code}|IDA`] ?? [];
  const list = dedupe(ids);
  return { label: `Ruta ${code} · ${list[0]} → ${list[list.length - 1]}`, places: list };
});

/** "Hasta": destinos directos desde `from`, agrupados por ruta y sentido, en orden de recorrido. */
export function destinationGroups(from: string): PlaceGroup[] {
  const groups: PlaceGroup[] = [];
  for (const code of ROUTE_ORDER) {
    for (const dir of ["IDA", "VUELTA"]) {
      const ids = routes[`${code}|${dir}`] ?? [];
      const i = ids.findIndex((id) => stops[id]?.place === from);
      if (i < 0) continue;
      const after = dedupe(ids.slice(i + 1)).filter((p) => p !== from);
      if (!after.length) continue;
      const end = dedupe(ids).at(-1);
      groups.push({ label: `Ruta ${code} · hacia ${end}`, places: after });
    }
  }
  return groups;
}

/** Lugar con paradero más cercano a una coordenada, y su distancia en metros. */
export function nearestPlace(lat: number, lng: number): { place: string; meters: number } {
  let best = { place: "", meters: Infinity };
  for (const s of Object.values(stops)) {
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
export function rideDistanceM(trip: Trip): number {
  let d = 0;
  for (let k = 1; k < trip.stopIds.length; k++) d += distanceM(stops[trip.stopIds[k - 1]], stops[trip.stopIds[k]]);
  return d;
}
