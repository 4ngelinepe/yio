/**
 * Datos en vivo.
 * - Clima y aire: Open-Meteo (gratis, sin llave, uso no comercial).
 * - Llegadas del Corredor Rojo: el API no permite llamadas desde otros sitios (CORS),
 *   así que pasa por un intermediario: la Edge Function supabase/functions/rojo-arrivals.
 * - Llegadas del Expreso San Isidro: Zenbus (protobuf), vía supabase/functions/esi-arrivals.
 *   Si no responden, YIO usa frecuencias estimadas.
 */
import type { IconName } from "../data/content";
import { ARRIVALS_URL, ESI_ARRIVALS_URL, STREET_TIMES_URL } from "./supabase";
import type { Network, Trip } from "../data/networks";

export type HourForecast = { hour: string; temp: number; label: string; icon: IconName; rainProb: number };
export type Weather = {
  temp: number; code: number; label: string; icon: IconName; rainy: boolean;
  /** Próximas horas (cada 3 h). */
  next: HourForecast[];
  /** Probabilidad de lluvia ≥ 50% en las próximas 3 horas. */
  rainSoon: boolean;
  /** Hora local de Lima, "HH:MM". */
  sunrise: string;
  sunset: string;
};
export type Air = { usAqi: number; pm25: number };

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
        "&current=temperature_2m,weather_code" +
        "&hourly=temperature_2m,weather_code,precipitation_probability&forecast_hours=13" +
        "&daily=sunrise,sunset&forecast_days=1&timezone=America%2FLima",
    );
    const code = Number(d.current.weather_code);
    const h = d.hourly as { time: string[]; temperature_2m: number[]; weather_code: number[]; precipitation_probability: (number | null)[] };
    const hours: HourForecast[] = h.time.map((t, i) => ({
      hour: t.slice(11, 13) + "h",
      temp: Math.round(h.temperature_2m[i]),
      rainProb: h.precipitation_probability[i] ?? 0,
      ...describe(Number(h.weather_code[i])),
    }));
    return {
      temp: Math.round(d.current.temperature_2m),
      code,
      ...describe(code),
      next: [3, 6, 9, 12].map((k) => hours[k]).filter(Boolean),
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
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi,pm2_5&timezone=America%2FLima`,
    );
    return { usAqi: Math.round(d.current.us_aqi), pm25: d.current.pm2_5 };
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
export type StreetTimes = { walk: { m: number; s: number } | null; bike: { m: number; s: number } | null };

export async function getStreetTimes(a: { lat: number; lng: number }, b: { lat: number; lng: number }): Promise<StreetTimes | null> {
  const f = (p: { lat: number; lng: number }) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
  try {
    const d = (await getJson(`${STREET_TIMES_URL}?from=${f(a)}&to=${f(b)}`, 7000)) as StreetTimes;
    return d && (d.walk || d.bike) ? d : null;
  } catch {
    return null;
  }
}
