/**
 * Ahorros guardados.
 * - Sin sesión: en este dispositivo (localStorage).
 * - Con sesión: en Supabase (tabla public.savings, cada usuario solo ve los suyos).
 * - Con sesión pero sin conexión: van a una cola "pendientes" y se suben al reconectar.
 * Al entrar, los ahorros locales se suben a la cuenta y se borran del dispositivo.
 */
import type { ModeId } from "../data/content";
import { supabase } from "./supabase";

export type SavedTrip = {
  id: string;
  date: string; // ISO
  from: string;
  to: string;
  mode: ModeId;
  route?: string; // ej. "Corredor Rojo 201"
  amount: number; // soles, punto medio del rango estimado
  kcal: number;
  km?: number; // distancia del viaje

  pending?: boolean; // guardado sin conexión, falta subirlo
};

const KEY = "geo.savings.v1";
const PENDING_KEY = "yio.pending.v1";

const read = (key: string): SavedTrip[] => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as SavedTrip[]) : [];
  } catch {
    return [];
  }
};
const write = (key: string, list: SavedTrip[]) => {
  try {
    if (list.length) localStorage.setItem(key, JSON.stringify(list));
    else localStorage.removeItem(key);
  } catch {
    /* sin storage: queda solo en memoria */
  }
};

export const loadLocal = () => read(KEY);
export const storeLocal = (list: SavedTrip[]) => write(KEY, list);
export const loadPending = () => read(PENDING_KEY);
export const storePending = (list: SavedTrip[]) => write(PENDING_KEY, list);

type Row = {
  id: string; trip_at: string; from_place: string; to_place: string; mode: ModeId;
  route?: string | null; amount: number; kcal: number; km?: number | null;
};

const COLS = "id, trip_at, from_place, to_place, mode, amount, kcal";
// La columna "route" se agregó después; si la base aún no la tiene, se trabaja sin ella.
let hasRouteColumn = true;
// La columna "km" (bitácora) se agregó en nov 2026; mismo respaldo.
let hasKmColumn = true;
const cols = () => `${COLS}${hasRouteColumn ? ", route" : ""}${hasKmColumn ? ", km" : ""}`;
const missingRoute = (e: { message?: string } | null) => !!e?.message && /route/i.test(e.message);
const missingKm = (e: { message?: string } | null) => !!e?.message && /\bkm\b/i.test(e.message);

const toRow = (t: SavedTrip) => ({
  trip_at: t.date, from_place: t.from, to_place: t.to, mode: t.mode, amount: t.amount, kcal: t.kcal,
  ...(hasRouteColumn && t.route ? { route: t.route } : {}),
  ...(hasKmColumn && t.km != null ? { km: t.km } : {}),
});
const fromRow = (r: Row): SavedTrip => ({
  id: r.id, date: r.trip_at, from: r.from_place, to: r.to_place, mode: r.mode,
  route: r.route ?? undefined, amount: Number(r.amount), kcal: r.kcal,
  km: r.km != null ? Number(r.km) : undefined,
});

export async function loadRemote(): Promise<SavedTrip[]> {
  let res = await supabase.from("savings").select(cols()).order("trip_at", { ascending: false }).limit(500);
  for (let i = 0; i < 2 && res.error; i++) {
    if (hasKmColumn && missingKm(res.error)) hasKmColumn = false;
    else if (hasRouteColumn && missingRoute(res.error)) hasRouteColumn = false;
    else break;
    res = await supabase.from("savings").select(cols()).order("trip_at", { ascending: false }).limit(500);
  }
  if (res.error) throw res.error;
  return (res.data as unknown as Row[]).map(fromRow);
}

export async function addRemote(trips: SavedTrip[]): Promise<SavedTrip[]> {
  if (!trips.length) return [];
  let res = await supabase.from("savings").insert(trips.map(toRow)).select(cols());
  for (let i = 0; i < 2 && res.error; i++) {
    if (hasKmColumn && missingKm(res.error)) hasKmColumn = false;
    else if (hasRouteColumn && missingRoute(res.error)) hasRouteColumn = false;
    else break;
    res = await supabase.from("savings").insert(trips.map(toRow)).select(cols());
  }
  if (res.error) throw res.error;
  return (res.data as unknown as Row[]).map(fromRow);
}

export async function deleteRemote(id: string): Promise<void> {
  const { error } = await supabase.from("savings").delete().eq("id", id);
  if (error) throw error;
}

export async function clearRemote(): Promise<void> {
  // RLS limita el borrado a las filas del propio usuario.
  const { error } = await supabase.from("savings").delete().not("id", "is", null);
  if (error) throw error;
}

export const modeLabel = (m: ModeId) =>
  ({ walk: "caminando", bike: "en bici", scooter: "en scooter", bus: "en bus", taxi: "en taxi" })[m];

/** ¿Hubo bici en el viaje? (en bici, o bici hasta el paradero + bus o Metro) */
export const isBikeTrip = (t: SavedTrip) => t.mode === "bike" || /^Bici \+/.test(t.route ?? "");
/** Ley 30936: un día libre por cada 60 viajes en bici certificados (sector público). */
export const BIKE_TRIPS_PER_DAY_OFF = 60;

export function monthSummary(list: SavedTrip[], now = new Date()) {
  const month = list.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  return {
    trips: month.length,
    amount: month.reduce((s, t) => s + t.amount, 0),
    kcal: month.reduce((s, t) => s + t.kcal, 0),
    active: month.filter((t) => t.mode !== "bus").length,
    km: Math.round(month.reduce((s, t) => s + (t.km ?? 0), 0) * 10) / 10,
    bikeTrips: list.filter(isBikeTrip).length,
  };
}
