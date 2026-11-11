/**
 * Capa de ciclovías (solo visual, no entra en la recomendación).
 * Fuente: "Ciclovías de Lima – Pedalea Seguro 2.0", mapa público de spdaambiental en ArcGIS Online.
 * https://www.arcgis.com/apps/mapviewer/index.html?webmap=b19d56481801400286634f325be54810
 * Sin licencia indicada: citar la fuente; pedir permiso antes de cualquier uso comercial.
 */
import type { FeatureCollection } from "geojson";

const SVC = "https://services7.arcgis.com/TOuassHKg3yWkrb9/arcgis/rest/services/";

export const BIKE_LAYERS = [
  { id: "Ciclovia_2_BM", label: "Ciclovía", dash: undefined },
  { id: "CicloAcera_2_BM", label: "Cicloacera", dash: "2 6" },
  { id: "Ciclo_Carril", label: "Ciclocarril", dash: "8 4" },
  { id: "CicloSenda_2_BM", label: "Ciclosenda", dash: "2 6" },
  { id: "Carril_Compartido_2_BM", label: "Carril compartido", dash: "1 8" },
] as const;

export const BIKE_PARKING = "Cicloparqueaderos_Agrupado";
export const BIKE_SOURCE = "Ciclovías: Pedalea Seguro 2.0 (spdaambiental, ArcGIS)";

export type BBox = [number, number, number, number]; // minLng, minLat, maxLng, maxLat

async function query(layer: string, bbox: BBox): Promise<FeatureCollection | null> {
  const params = new URLSearchParams({
    where: "1=1",
    geometry: bbox.join(","),
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "*",
    outSR: "4326",
    f: "geojson",
  });
  try {
    const r = await fetch(`${SVC}${layer}/FeatureServer/0/query?${params}`);
    if (!r.ok) return null;
    const j = await r.json();
    // ArcGIS responde 200 con {error} cuando algo falla: validar antes de pintar.
    return j?.type === "FeatureCollection" && Array.isArray(j.features) ? (j as FeatureCollection) : null;
  } catch {
    return null;
  }
}

/** Ciclovías y cicloparqueaderos dentro del recuadro del tramo. */
export async function getBikeData(bbox: BBox) {
  const [lanes, parking] = await Promise.all([
    Promise.all(BIKE_LAYERS.map(async (l) => ({ ...l, data: await query(l.id, bbox) }))),
    query(BIKE_PARKING, bbox),
  ]);
  return { lanes, parking };
}

/* ───────── Cuánto de una ruta en bici va por ciclovía ───────── */

export type BikeCoverage = {
  /** Porcentaje del recorrido a ≤ 20 m de una ciclovía, cicloacera o ciclocarril. */
  pct: number;
  km: number;
  /** Vías con ciclovía que usa la ruta, de la más larga a la más corta. */
  names: string[];
  /** Parte del recorrido en ciclovía segregada (no solo pintura). */
  segregatedPct: number;
};

type Seg = { a: [number, number]; b: [number, number]; name: string; segregated: boolean };

const M_LAT = 110_574;
const M_LNG = 108_900; // a la latitud de Lima

/** Distancia en metros de un punto a un segmento (aproximación plana, suficiente a escala de ciudad). */
function distToSeg(p: [number, number], a: [number, number], b: [number, number]): number {
  const px = p[1] * M_LNG, py = p[0] * M_LAT;
  const ax = a[1] * M_LNG, ay = a[0] * M_LAT, bx = b[1] * M_LNG, by = b[0] * M_LAT;
  const dx = bx - ax, dy = by - ay;
  const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

const cleanName = (props: Record<string, unknown> | null): string => {
  const v = String(props?.["Vía"] ?? props?.Nombre_de ?? "").replace(/^C[ií]clov[ií]a\s+/i, "").replace(/-+$/, "").trim();
  return v || "Ciclovía";
};

/** path en [lat, lng]. Ignora capas de "carril compartido" (no es infraestructura para bici). */
export function bikeCoverage(path: [number, number][], lanes: Awaited<ReturnType<typeof getBikeData>>["lanes"]): BikeCoverage | null {
  if (path.length < 2) return null;
  const segs: Seg[] = [];
  for (const l of lanes) {
    if (!l.data || l.id === "Carril_Compartido_2_BM") continue;
    for (const f of l.data.features) {
      const g = f.geometry;
      const lines = g?.type === "LineString" ? [g.coordinates] : g?.type === "MultiLineString" ? g.coordinates : [];
      const name = cleanName(f.properties as Record<string, unknown>);
      const segregated = String((f.properties as Record<string, unknown>)?.Tipo ?? "").toLowerCase().startsWith("vía segregada");
      for (const line of lines)
        for (let i = 1; i < line.length; i++)
          segs.push({ a: [line[i - 1][1], line[i - 1][0]], b: [line[i][1], line[i][0]], name, segregated });
    }
  }
  if (!segs.length) return { pct: 0, km: 0, names: [], segregatedPct: 0 };

  let total = 0, on = 0, seg = 0;
  const byName = new Map<string, number>();
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const len = Math.hypot((b[0] - a[0]) * M_LAT, (b[1] - a[1]) * M_LNG);
    const steps = Math.max(1, Math.round(len / 10)); // muestra cada ~10 m
    for (let k = 0; k < steps; k++) {
      const t = (k + 0.5) / steps;
      const p: [number, number] = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      const piece = len / steps;
      total += piece;
      let best: Seg | null = null, bestD = 20;
      for (const s of segs) {
        // descarte rápido por caja
        if (p[0] < Math.min(s.a[0], s.b[0]) - 0.0003 || p[0] > Math.max(s.a[0], s.b[0]) + 0.0003) continue;
        if (p[1] < Math.min(s.a[1], s.b[1]) - 0.0003 || p[1] > Math.max(s.a[1], s.b[1]) + 0.0003) continue;
        const d = distToSeg(p, s.a, s.b);
        if (d <= bestD) { bestD = d; best = s; }
      }
      if (best) {
        on += piece;
        if (best.segregated) seg += piece;
        byName.set(best.name, (byName.get(best.name) ?? 0) + piece);
      }
    }
  }
  const names = [...byName.entries()].filter(([, m]) => m >= 150).sort((x, y) => y[1] - x[1]).map(([n]) => n);
  return {
    pct: total ? Math.round((on / total) * 100) : 0,
    km: Math.round(on / 100) / 10,
    names: names.slice(0, 3),
    segregatedPct: total ? Math.round((seg / total) * 100) : 0,
  };
}

/** Solo los tramos de ciclovía por donde pasa la ruta (a ≤ maxM metros de ella). path en [lat, lng]. */
export function nearPath(fc: FeatureCollection, path: [number, number][], maxM = 25): FeatureCollection {
  const pts: [number, number][] = [];
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const len = Math.hypot((b[0] - a[0]) * M_LAT, (b[1] - a[1]) * M_LNG);
    const n = Math.max(1, Math.round(len / 15));
    for (let k = 0; k <= n; k++) pts.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  const touches = (line: number[][]) => {
    for (let i = 1; i < line.length; i++) {
      const a: [number, number] = [line[i - 1][1], line[i - 1][0]], b: [number, number] = [line[i][1], line[i][0]];
      for (const p of pts) if (distToSeg(p, a, b) <= maxM) return true;
    }
    return false;
  };
  return {
    ...fc,
    features: fc.features.filter((f) => {
      const g = f.geometry;
      if (g?.type === "LineString") return touches(g.coordinates);
      if (g?.type === "MultiLineString") return g.coordinates.some(touches);
      if (g?.type === "Point") return pts.some((p) => Math.hypot((p[0] - g.coordinates[1]) * M_LAT, (p[1] - g.coordinates[0]) * M_LNG) <= 150);
      return false;
    }),
  };
}
