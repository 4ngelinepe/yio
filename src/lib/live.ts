/**
 * Datos en vivo.
 * - Clima y aire: Open-Meteo (gratis, sin llave, uso no comercial).
 * - Llegadas del Corredor Rojo: el API no permite llamadas desde otros sitios (CORS),
 *   así que pasa por un intermediario: la Edge Function supabase/functions/rojo-arrivals.
 * - Llegadas del Expreso San Isidro: Zenbus (protobuf), vía supabase/functions/esi-arrivals.
 *   Si no responden, YIO usa frecuencias estimadas.
 */
import type { IconName } from "../data/content";
import { ARRIVALS_URL, ESI_ARRIVALS_URL, PLACES_URL, STREET_TIMES_URL } from "./supabase";
import type { Network, Trip } from "../data/networks";

export type HourForecast = { hour: string; temp: number; label: string; icon: IconName; rainProb: number; uv: number };
export type Weather = {
  temp: number; code: number; label: string; icon: IconName; rainy: boolean;
  /** Próximas horas (cada 3 h). */
  next: HourForecast[];
  /** Probabilidad de lluvia ≥ 50% en las próximas 3 horas. */
  rainSoon: boolean;
  /** Índice UV actual. */
  uvNow: number;
  /** Las próximas 13 horas (para calcular la mejor hora para caminar). */
  hours: HourForecast[];
  /** Hora local de Lima, "HH:MM". */
  sunrise: string;
  sunset: string;
};
export type Air = { usAqi: number; pm25: number; hourly: number[] };

function describe(code: number): { label: string; icon: IconName; rainy: boolean } {
  if (code === 0) return { label: "Despejado", icon: "sun", rainy: false };
  if (code <= 2) return { label: "Parcialmente nublado", icon: "cloud", rainy: false };
  if (code === 3) return { label: "Nublado", icon: "cloud", rainy: false };
  if (code === 45 || code === 48) return { label: "Neblina", icon: "cloud", rainy: false };
  if (code >= 51 && code <= 57) return { label: "Llovizna", icon: "rain", rainy: true };
  if (code >= 61 && code <= 82) return { label: "Lluvia", icon: "rain", rainy: true };
  if (code >= 95) return { label: "Tormenta", icon: "rain", rainy: true };
  return { label: "Variable", icon: "cloud", rainy: false };
}

async function getJson(url: string, ms = 6000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error(String(r.status));
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

export async function getWeather(lat: number, lng: number): Promise<Weather | null> {
  try {
    const d = await getJson(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
        "&current=temperature_2m,weather_code,uv_index" +
        "&hourly=temperature_2m,weather_code,precipitation_probability,uv_index&forecast_hours=13" +
        "&daily=sunrise,sunset&forecast_days=1&timezone=America%2FLima",
    );
    const code = Number(d.current.weather_code);
    const h = d.hourly as { time: string[]; temperature_2m: number[]; weather_code: number[]; precipitation_probability: (number | null)[]; uv_index?: (number | null)[] };
    const hours: HourForecast[] = h.time.map((t, i) => ({
      hour: t.slice(11, 13) + "h",
      temp: Math.round(h.temperature_2m[i]),
      rainProb: h.precipitation_probability[i] ?? 0,
      uv: h.uv_index?.[i] ?? 0,
      ...describe(Number(h.weather_code[i])),
    }));
    return {
      temp: Math.round(d.current.temperature_2m),
      code,
      ...describe(code),
      next: [3, 6, 9, 12].map((k) => hours[k]).filter(Boolean),
      uvNow: Number(d.current.uv_index ?? hours[0]?.uv ?? 0),
      hours,
      rainSoon: hours.slice(0, 4).some((x) => x.rainProb >= 50),
      sunrise: String(d.daily.sunrise[0]).slice(11, 16),
      sunset: String(d.daily.sunset[0]).slice(11, 16),
    };
  } catch {
    return null;
  }
}

export async function getAir(lat: number, lng: number): Promise<Air | null> {
  try {
    const d = await getJson(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi,pm2_5&hourly=us_aqi&forecast_hours=13&timezone=America%2FLima`,
    );
    return { usAqi: Math.round(d.current.us_aqi), pm25: d.current.pm2_5, hourly: ((d.hourly?.us_aqi ?? []) as (number | null)[]).map((x) => Math.round(x ?? d.current.us_aqi)) };
  } catch {
    return null;
  }
}

/** Minutos hasta el próximo bus de esa ruta en ese paradero, o null si no hay dato en vivo. */
export async function getNextBusMinutes(stopId: string, routeCode: string): Promise<number | null> {
  try {
    const list = (await getJson(`${ARRIVALS_URL}?stopId=${encodeURIComponent(stopId)}`, 5000)) as {
      lineName: string;
      estimatedTime: number;
    }[];
    const next = list
      .filter((b) => b.lineName === routeCode)
      .map((b) => (b.estimatedTime - Date.now()) / 60000)
      .filter((m) => m >= 0)
      .sort((a, b) => a - b)[0];
    return next === undefined ? null : Math.round(next);
  } catch {
    return null;
  }
}

/** Próximo bus para el tramo elegido. `none` = no quedan salidas hoy en esa ruta. */
export type BusEta = { minutes: number; source: "live" | "schedule" } | { none: true } | null;

export async function getBusEta(net: Network, trip: Trip): Promise<BusEta> {
  if (!net.live) return null;
  if (net.id === "rojo") {
    const m = await getNextBusMinutes(trip.stopIds[0], trip.route.code);
    return m === null ? null : { minutes: m, source: "live" };
  }
  if (!trip.route.liveId) return null;
  try {
    const d = (await getJson(`${ESI_ARRIVALS_URL}?itinerary=${trip.route.liveId}&index=${trip.fromIndex}`, 6000)) as {
      minutes: number | null; source?: "live" | "schedule"; reason?: string;
    };
    if (d.minutes !== null && d.source) return { minutes: d.minutes, source: d.source };
    return d.reason === "sin-salidas" ? { none: true } : null;
  } catch {
    return null;
  }
}

/** Tiempos reales por calles (OpenRouteService vía street-times). m = metros, s = segundos. */
export type StreetLeg = { m: number; s: number; path?: [number, number][] };
export type StreetTimes = { walk: StreetLeg | null; bike: StreetLeg | null };

export async function getStreetTimes(a: { lat: number; lng: number }, b: { lat: number; lng: number }): Promise<StreetTimes | null> {
  const f = (p: { lat: number; lng: number }) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
  try {
    const d = (await getJson(`${STREET_TIMES_URL}?from=${f(a)}&to=${f(b)}`, 7000)) as StreetTimes;
    return d && (d.walk || d.bike) ? d : null;
  } catch {
    return null;
  }
}

/* ───────── Buscador de lugares ───────── */
export type FoundPlace = { name: string; detail: string; lat: number; lng: number };

/**
 * Busca lugares en Lima.
 * - Primero en el puente `places` (HeiGIT Pelias): permite autocompletar.
 * - Si el puente falla y es una búsqueda completa, cae a Nominatim (OSM).
 *   Nominatim no permite autocompletar, así que en modo "auto" sin puente devuelve null.
 */
export async function searchPlaces(q: string, mode: "auto" | "search" = "search"): Promise<FoundPlace[] | null> {
  try {
    const d = (await getJson(`${PLACES_URL}?${new URLSearchParams({ q, mode })}`, mode === "auto" ? 3500 : 5000)) as { places?: FoundPlace[] };
    if (Array.isArray(d.places)) return d.places;
  } catch { /* sigue con el plan B */ }
  if (mode === "auto") return null;
  return searchNominatim(q);
}

async function searchNominatim(q: string): Promise<FoundPlace[]> {
  const url = "https://nominatim.openstreetmap.org/search?" + new URLSearchParams({
    format: "jsonv2", q, countrycodes: "pe", viewbox: "-77.25,-11.75,-76.75,-12.45", bounded: "1", limit: "6", "accept-language": "es",
  });
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`nominatim ${res.status}`);
  const rows = (await res.json()) as { name?: string; display_name: string; lat: string; lon: string }[];
  return rows.map((r) => {
    const parts = r.display_name.split(",").map((x) => x.trim());
    const name = r.name || parts[0];
    const rest = parts.filter((x) => x !== name && !/^\d{5}$/.test(x) && x !== "Perú" && x !== "Lima Metropolitana");
    return { name, detail: rest.slice(0, 3).join(", "), lat: Number(r.lat), lng: Number(r.lon) };
  });
}
