/**
 * Lugares guardados: Casa, Trabajo y los 3 últimos usados.
 * Viven solo en este dispositivo (localStorage): una dirección de casa no se sube a la nube.
 */
import type { Place } from "../data/networks";

export type SavedPlaces = { casa?: Place; trabajo?: Place; recent: Place[] };
export type SlotId = "casa" | "trabajo";
const KEY = "yio.places";

export function loadSaved(): SavedPlaces {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (v && Array.isArray(v.recent)) return v;
  } catch { /* noop */ }
  return { recent: [] };
}

function store(s: SavedPlaces) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* noop */ }
}

const same = (a: Place, b: Place) => Math.abs(a.lat - b.lat) < 0.0002 && Math.abs(a.lng - b.lng) < 0.0002;

export function setSlot(s: SavedPlaces, slot: SlotId, p: Place | undefined): SavedPlaces {
  const next = { ...s, [slot]: p ? { name: p.name, lat: p.lat, lng: p.lng } : undefined };
  store(next);
  return next;
}

export function remember(s: SavedPlaces, p: Place): SavedPlaces {
  if (p.name === "Mi ubicación" || (s.casa && same(s.casa, p)) || (s.trabajo && same(s.trabajo, p))) return s;
  const next = { ...s, recent: [{ name: p.name, lat: p.lat, lng: p.lng }, ...s.recent.filter((r) => !same(r, p))].slice(0, 3) };
  store(next);
  return next;
}

export const slotOf = (s: SavedPlaces, p: Place): SlotId | null =>
  s.casa && same(s.casa, p) ? "casa" : s.trabajo && same(s.trabajo, p) ? "trabajo" : null;

/** Borra un lugar de los recientes (la × de cada etiqueta). */
export function forget(s: SavedPlaces, p: Place): SavedPlaces {
  const next = { ...s, recent: s.recent.filter((r) => !same(r, p)) };
  store(next);
  return next;
}
