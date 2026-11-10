/**
 * Ahorros guardados en este dispositivo (localStorage).
 * Con el login (Supabase) esto pasa a la nube; la forma del dato se mantiene.
 */
import type { ModeId } from "../data/content";

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

export function loadSavings(): SavedTrip[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedTrip[]) : [];
  } catch {
    return [];
  }
}

export function storeSavings(list: SavedTrip[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* sin storage: queda solo en memoria */
  }
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
