/**
 * Ahorros guardados.
 * - Sin sesión: en este dispositivo (localStorage).
 * - Con sesión: en Supabase (tabla public.savings, cada usuario solo ve los suyos).
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
  amount: number; // soles, punto medio del rango estimado
  kcal: number;
};

const KEY = "geo.savings.v1";

export function loadLocal(): SavedTrip[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedTrip[]) : [];
  } catch {
    return [];
  }
}

export function storeLocal(list: SavedTrip[]): void {
  try {
    if (list.length) localStorage.setItem(KEY, JSON.stringify(list));
    else localStorage.removeItem(KEY);
  } catch {
    /* sin storage: queda solo en memoria */
  }
}

type Row = { id: string; trip_at: string; from_place: string; to_place: string; mode: ModeId; amount: number; kcal: number };

const toRow = (t: SavedTrip) => ({
  trip_at: t.date, from_place: t.from, to_place: t.to, mode: t.mode, amount: t.amount, kcal: t.kcal,
});
const fromRow = (r: Row): SavedTrip => ({
  id: r.id, date: r.trip_at, from: r.from_place, to: r.to_place, mode: r.mode, amount: Number(r.amount), kcal: r.kcal,
});

export async function loadRemote(): Promise<SavedTrip[]> {
  const { data, error } = await supabase
    .from("savings")
    .select("id, trip_at, from_place, to_place, mode, amount, kcal")
    .order("trip_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

export async function addRemote(trips: SavedTrip[]): Promise<SavedTrip[]> {
  if (!trips.length) return [];
  const { data, error } = await supabase
    .from("savings")
    .insert(trips.map(toRow))
    .select("id, trip_at, from_place, to_place, mode, amount, kcal");
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

export async function clearRemote(): Promise<void> {
  // RLS limita el borrado a las filas del propio usuario.
  const { error } = await supabase.from("savings").delete().not("id", "is", null);
  if (error) throw error;
}

export function monthSummary(list: SavedTrip[], now = new Date()) {
  const month = list.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  return {
    trips: month.length,
    amount: month.reduce((s, t) => s + t.amount, 0),
    kcal: month.reduce((s, t) => s + t.kcal, 0),
    walks: month.filter((t) => t.mode === "walk").length,
  };
}
