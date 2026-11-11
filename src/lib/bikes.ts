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
