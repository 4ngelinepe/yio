/**
 * Biciestacionamientos de Lima (Pedalea Seguro 2.0, capa Cicloparqueaderos_Agrupado).
 * Datos de 2023: puede haber puntos que ya no existan y faltar los nuevos.
 * No dicen capacidad, vigilancia ni horario.
 */
import data from "../data/bikeparking.json";

export type ParkingType = "P" | "M" | "V" | "H";
export type Parking = { lat: number; lng: number; type: ParkingType; m: number };

export const PARKING_TYPE: Record<ParkingType, string> = {
  P: "biciestacionamiento público",
  M: "biciestacionamiento público-privado",
  V: "biciestacionamiento privado",
  H: "biciestacionamiento con herramientas",
};
export const PARKING_SOURCE = "Biciestacionamientos: Pedalea Seguro 2.0 (2023)";

const POINTS = (data.points as [number, number, string][]).map(([lat, lng, t]) => ({ lat, lng, type: t as ParkingType }));
const M_LAT = 110574, M_LNG = 108900;
const dist = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
  Math.hypot((a.lat - b.lat) * M_LAT, (a.lng - b.lng) * M_LNG);

/** El biciestacionamiento de uso público (público, mixto o con herramientas) más cercano, dentro de maxM. */
export function nearestParking(p: { lat: number; lng: number }, maxM = 200): Parking | null {
  let best: Parking | null = null;
  for (const q of POINTS) {
    if (q.type === "V") continue; // privado: solo para clientes o residentes
    const m = dist(p, q);
    if (m <= maxM && (!best || m < best.m)) best = { ...q, m: Math.round(m) };
  }
  return best;
}
