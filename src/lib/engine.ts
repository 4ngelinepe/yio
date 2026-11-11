/**
 * Motor de recomendación de YIO (Fase 1).
 *
 * Reglas transparentes, sin magia. Todo número es un rango porque es un estimado.
 * Supuestos (ajustar con datos reales cuando existan):
 *  - Caminar: 4.8 km/h (80 m/min); la calle real es ~20% más larga que la línea recta.
 *  - YIO nunca recomienda taxi: es la referencia para medir el ahorro.
 *  - Bici: 14 km/h promedio; misma distancia que caminando. Solo se recomienda si el usuario tiene bici.
 *  - Bus Rojo: 11 km/h en hora punta, 17 km/h fuera; espera 3–8 min (punta) o 4–12 min.
 *  - Taxi: 14 km/h en punta, 24 km/h fuera; tarifa de referencia, no oficial.
 *  - Hora punta: lun–vie 7–10 am y 5–8 pm.
 *  - Aire: AQI (US) ≤100 respirable, ≤150 moderado, >150 evitar. Lluvia o ≥30 °C suben un nivel.
 */
import {
  quotes, type GoalId, type ModeId, type ModeOption, type Range, type Recommendation, type StatusLevel,
} from "../data/content";
import { ROJO_FARE, distanceM, findTrip, rideDistanceM, routeLabel, stops } from "../data/rojo";
import type { Air, Weather } from "./live";

export type EngineInput = {
  from: string;
  to: string;
  goal: GoalId;
  now: Date;
  weather: Weather | null;
  air: Air | null;
  nextBusMin: number | null;
  hasBike: boolean;
};

const round = (n: number) => Math.max(1, Math.round(n));
const roundHalf = (n: number) => Math.round(n * 2) / 2;
const mid = (r: Range) => (r[0] + r[1]) / 2;
export const soles = (n: number) => `S/ ${n.toFixed(2)}`;
export const solesRange = (r: Range) => (r[0] === r[1] ? soles(r[0]) : `${soles(r[0])} – ${soles(r[1])}`);
export const minRange = (r: Range) => (r[0] === r[1] ? `${r[0]} min` : `${r[0]}–${r[1]} min`);

export function isPeak(d: Date): boolean {
  const day = d.getDay();
  const h = d.getHours();
  return day >= 1 && day <= 5 && ((h >= 7 && h < 10) || (h >= 17 && h < 20));
}

function airStatus(air: Air | null, weather: Weather | null): { level: StatusLevel; reason: string } {
  let level: StatusLevel = 1;
  const parts: string[] = [];
  if (air) {
    level = air.usAqi <= 100 ? 1 : air.usAqi <= 150 ? 2 : 3;
    parts.push(`Calidad del aire ${air.usAqi <= 50 ? "buena" : air.usAqi <= 100 ? "aceptable" : air.usAqi <= 150 ? "regular" : "mala"} (AQI ${air.usAqi})`);
  } else {
    parts.push("Sin dato de aire ahora");
  }
  if (weather?.rainy) { level = Math.max(level, 2) as StatusLevel; parts.push(weather.label.toLowerCase()); }
  if (weather && weather.temp >= 30) { level = Math.max(level, 2) as StatusLevel; parts.push(`${weather.temp} °C`); }
  return { level, reason: parts.join(" · ") };
}

export function recommend(input: EngineInput): Recommendation | null {
  const trip = findTrip(input.from, input.to);
  if (!trip) return null;

  const first = stops[trip.stopIds[0]];
  const last = stops[trip.stopIds[trip.stopIds.length - 1]];
  const middle = stops[trip.stopIds[Math.floor(trip.stopIds.length / 2)]];
  const peak = isPeak(input.now);

  // Caminar
  const walkM = distanceM(first, last) * 1.2;
  const walkMin = walkM / 80;
  const walk: ModeOption = {
    id: "walk", title: "Caminar este tramo", subtitle: "Sin pasaje, sin tráfico", icon: "footprints",
    minutes: [round(walkMin * 0.9), round(walkMin * 1.1)],
    cost: [0, 0],
    kcal: Math.round((walkM / 1000) * 55),
    congestion: "Cero",
  };

  // Bici
  const bikeMin = (walkM / 1000 / 14) * 60;
  const bike: ModeOption = {
    id: "bike", title: "Ir en bici", subtitle: input.hasBike ? "Con tu bici" : "Si tienes bici a la mano", icon: "bike",
    minutes: [round(bikeMin * 0.9 + 2), round(bikeMin * 1.2 + 4)],
    cost: [0, 0],
    kcal: Math.round((walkM / 1000) * 28),
    congestion: "Cero",
    note: "Revisa las ciclovías del tramo en el mapa.",
  };

  // Bus Rojo
  const rideKm = (rideDistanceM(trip) * 1.05) / 1000;
  const rideMin = (rideKm / (peak ? 11 : 17)) * 60;
  const wait: Range = input.nextBusMin !== null ? [input.nextBusMin, input.nextBusMin] : peak ? [3, 8] : [4, 12];
  const bus: ModeOption = {
    id: "bus", title: `Corredor Rojo ${trip.routeKey.split("|")[0]}`, subtitle: routeLabel(trip.routeKey), icon: "bus",
    minutes: [round(rideMin * 0.9 + wait[0] + 2), round(rideMin * 1.2 + wait[1] + 5)],
    cost: [ROJO_FARE, ROJO_FARE],
    kcal: 0,
    congestion: peak ? "Media" : "Baja",
    note: input.nextBusMin !== null ? `Próximo bus en ${input.nextBusMin} min` : "Espera estimada según la hora",
  };

  // Taxi (referencial)
  const taxiMin = (rideKm / (peak ? 14 : 24)) * 60;
  const taxi: ModeOption = {
    id: "taxi", title: "Taxi / app", subtitle: "Tarifa referencial", icon: "car",
    minutes: [round(taxiMin * 0.9 + 3), round(taxiMin * 1.3 + 8)],
    cost: [roundHalf(Math.max(7, 5 + 1.5 * rideKm)), roundHalf(Math.max(10, 7 + 2.2 * rideKm))],
    kcal: 0,
    congestion: peak ? "Alta" : "Media",
  };

  // Decisión
  const status = airStatus(input.air, input.weather);
  const walkOk = status.level < 3 && mid(walk.minutes) <= 60;
  const bikeOk = input.hasBike && status.level < 3 && !input.weather?.rainy && mid(bike.minutes) <= 60;
  const fastest = [walkOk ? walk : null, bikeOk ? bike : null, bus]
    .filter((o): o is ModeOption => !!o)
    .sort((a, b) => mid(a.minutes) - mid(b.minutes))[0];
  const bm = mid(bike.minutes);

  let recommended: Exclude<ModeId, "taxi">;
  let why: string;
  const wm = mid(walk.minutes);
  switch (input.goal) {
    case "rapido":
      recommended = fastest.id as "walk" | "bike" | "bus";
      why = recommended === "walk" ? "Caminando llegas antes que esperando el bus."
        : recommended === "bike" ? "En bici llegas antes que en bus, y sin tráfico."
        : "Para este tramo, el Rojo te deja antes.";
      break;
    case "ahorro":
      recommended = walkOk && wm <= 25 ? "walk" : bikeOk ? "bike" : walkOk && wm <= 45 ? "walk" : "bus";
      why = recommended === "walk" ? "Es un tramo caminable: te ahorras el pasaje completo."
        : recommended === "bike" ? "En bici te ahorras el pasaje y llegas más rápido que caminando."
        : "El tramo es largo para caminar; el Rojo es la opción más barata.";
      break;
    case "trafico":
      recommended = bikeOk && bm <= mid(bus.minutes) + 10 ? "bike" : walkOk && wm <= (peak ? 50 : 35) ? "walk" : "bus";
      why = recommended === "bike" ? "En bici esquivas el tráfico y no sumas un auto más."
        : recommended === "walk" ? (peak ? "Es hora punta: caminando no dependes del tráfico." : "Caminando no sumas al tráfico.")
        : "El tramo es largo para caminar; el Rojo evita el taxi en el tráfico.";
      break;
    default:
      recommended = walkOk && wm <= 60 ? "walk" : bikeOk ? "bike" : "bus";
      why = recommended === "walk" ? "Moverte te hace bien y el aire lo permite."
        : recommended === "bike" ? "El tramo es largo a pie, pero en bici te mueves igual."
        : "Hoy mejor no caminar este tramo completo.";
  }
  if (!walkOk && status.level === 3 && recommended === "bus") why = "La calidad del aire no está para caminar ahora.";

  const rec = recommended === "walk" ? walk : recommended === "bike" ? bike : bus;
  const active = recommended !== "bus";
  const savings: Range =
    active ? [ROJO_FARE, taxi.cost[1]]
    : [Math.max(0, taxi.cost[0] - ROJO_FARE), Math.max(0, taxi.cost[1] - ROJO_FARE)];

  const monthly: Range = [savings[0] * 20, savings[1] * 20];
  const walkKm = walkM / 1000;

  return {
    createdAt: input.now.toISOString(),
    status,
    route: {
      from: input.from, via: middle.place, to: input.to, routeLabel: routeLabel(trip.routeKey),
      note: `${trip.stopIds.length - 1} paraderos`,
    },
    options: [walk, bike, bus, taxi],
    recommended,
    why,
    savings,
    today: [
      { label: recommended === "walk" ? "Duración caminando" : recommended === "bike" ? "Duración en bici" : "Duración del viaje", value: minRange(rec.minutes), icon: "clock", tone: "info" },
      { label: "Ahorro hoy", value: solesRange(savings), icon: "dollar", tone: "success" },
      { label: "Congestión generada", value: rec.congestion, icon: "car", tone: "highlight" },
    ],
    impact: {
      intro: "Si repites esta decisión 20 días/mes:",
      stats: [
        { label: "Ahorro", value: solesRange([Math.round(monthly[0]), Math.round(monthly[1])]).replace(/\.00/g, ""), icon: "dollar", tone: "success" },
        active
          ? { label: "Energía", value: `≈ ${(rec.kcal * 20).toLocaleString("es-PE")} kcal`, icon: "zap", tone: "energy" }
          : { label: "Viajes en transporte público", value: "20 viajes", icon: "bus", tone: "energy" },
        active
          ? { label: recommended === "bike" ? "Distancia en bici" : "Distancia caminada", value: `≈ ${Math.round(walkKm * 20)} km`, icon: recommended === "bike" ? "bike" : "footprints", tone: "highlight" }
          : { label: "Tiempo extra vs. taxi", value: `≈ ${Math.max(0, Math.round(((mid(bus.minutes) - mid(taxi.minutes)) * 20) / 60))} h al mes`, icon: "clock", tone: "highlight" },
      ],
      equivalences: [
        `${Math.floor(mid(monthly) / 12)} menús de almuerzo`,
        `${Math.floor(mid(monthly) / ROJO_FARE)} pasajes del Rojo`,
      ],
    },
    quote: quotes[input.goal][input.now.getDate() % quotes[input.goal].length],
    path: trip.stopIds.map((id) => ({ lat: stops[id].lat, lng: stops[id].lng, name: stops[id].place })),
    live: input.nextBusMin !== null,
  };
}
