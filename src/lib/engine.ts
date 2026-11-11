/**
 * Motor de recomendación de YIO (Fase 1).
 *
 * Reglas transparentes, sin magia. Todo número es un rango porque es un estimado.
 * Supuestos (ajustar con datos reales cuando existan):
 *  - Caminar: 4.8 km/h (80 m/min); la calle real es ~20% más larga que la línea recta.
 *  - YIO nunca recomienda taxi: es la referencia para medir el ahorro.
 *  - Bici: 14 km/h promedio; misma distancia que caminando. Solo se recomienda si el usuario tiene bici.
 *  - Scooter eléctrico: 16 km/h; ahorra y no congestiona, pero no suma calorías. Solo si el usuario tiene uno.
 *  - Bus Rojo: 11 km/h en hora punta, 17 km/h fuera; espera 3–8 min (punta) o 4–12 min.
 *  - Taxi: 14 km/h en punta, 24 km/h fuera; tarifa de referencia, no oficial.
 *  - Hora punta: lun–vie 7–10 am y 5–8 pm.
 *  - Aire: AQI (US) ≤100 respirable, ≤150 moderado, >150 evitar. Lluvia o ≥30 °C suben un nivel.
 */
import {
  quotes, type GoalId, type ModeId, type ModeOption, type Range, type Recommendation, type StatusLevel,
} from "../data/content";
import { ROJO, distanceM, findTrip, rideDistanceM, type Network } from "../data/networks";

/** Pasaje de referencia para las equivalencias ("N pasajes de bus"). */
const REF_FARE = ROJO.fare;
import type { Air, BusEta, StreetTimes, Weather } from "./live";

export type EngineInput = {
  network: Network;
  from: string;
  to: string;
  goal: GoalId;
  now: Date;
  weather: Weather | null;
  air: Air | null;
  busEta: BusEta;
  /** Tiempos reales por calles; si es null se estima en línea recta. */
  streets?: StreetTimes | null;
  hasBike: boolean;
  hasScooter: boolean;
};

const round = (n: number) => Math.max(1, Math.round(n));
const roundHalf = (n: number) => Math.round(n * 2) / 2;
const mid = (r: Range) => (r[0] + r[1]) / 2;
export const soles = (n: number) => `S/ ${n.toFixed(2)}`;
export const solesRange = (r: Range) => (r[0] === r[1] ? soles(r[0]) : `${soles(r[0])} – ${soles(r[1])}`);
export const minRange = (r: Range) => (r[0] === r[1] ? `${r[0]} min` : `${r[0]}–${r[1]} min`);

/** Hora punta en Lima (lun–vie 7–10 y 17–20), siempre en hora de Lima aunque el teléfono esté en otra zona. */
export const PEAK_LABEL = "lun–vie 7–10 a. m. y 5–8 p. m.";
export function isPeak(d: Date): boolean {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Lima", weekday: "short", hour: "numeric", hour12: false })
      .formatToParts(d).map((x) => [x.type, x.value]),
  );
  const h = Number(parts.hour) % 24;
  return !["Sat", "Sun"].includes(parts.weekday) && ((h >= 7 && h < 10) || (h >= 17 && h < 20));
}

/** El número AQI no le dice nada a la gente: lo traducimos a palabras. */
export function aqiLabel(aqi: number): string {
  return aqi <= 50 ? "bueno" : aqi <= 100 ? "aceptable" : aqi <= 150 ? "regular" : aqi <= 200 ? "malo" : "muy malo";
}


/** Índice UV en palabras (escala OMS). */
export function uvLabel(uv: number): string {
  return uv < 3 ? "bajo" : uv < 6 ? "moderado" : uv < 8 ? "alto" : uv < 11 ? "muy alto" : "extremo";
}

/** Mejor hora para caminar en las próximas horas: aire, sol, calor y lluvia. */
function bestWalkHour(weather: Weather | null, air: Air | null): Recommendation["conditions"]["bestHour"] {
  if (!weather?.hours?.length) return undefined;
  let best: { i: number; score: number } | null = null;
  weather.hours.forEach((h, i) => {
    const hour = Number(h.hour.slice(0, 2));
    if (hour < 6 || hour > 20) return;
    const aqi = air?.hourly?.[i] ?? air?.usAqi ?? 50;
    const score = aqi / 50 + (h.uv >= 8 ? 3 : h.uv >= 6 ? 1.5 : h.uv >= 3 ? 0.5 : 0)
      + (h.temp >= 28 ? 2 : h.temp >= 26 ? 1 : 0) + (h.rainProb >= 50 ? 3 : 0) + i * 0.05; // a igualdad, antes es mejor
    if (!best || score < best.score) best = { i, score };
  });
  if (!best) return undefined;
  const b = weather.hours[(best as { i: number }).i];
  const aqi = air?.hourly?.[(best as { i: number }).i] ?? air?.usAqi;
  const why = [aqi !== undefined ? `aire ${aqiLabel(aqi)}` : null, `UV ${uvLabel(b.uv)}`, `${b.temp}°`].filter(Boolean).join(", ");
  return { hour: `${b.hour.slice(0, 2)}:00`, why, now: (best as { i: number }).i === 0 };
}

function airStatus(air: Air | null, weather: Weather | null): { level: StatusLevel; reason: string; unknown?: boolean } {
  if (!air && !weather) return { level: 1, reason: "Sin conexión o sin datos en vivo: la recomendación usa tiempos estimados.", unknown: true };
  let level: StatusLevel = 1;
  const parts: string[] = [];
  if (air) {
    level = air.usAqi <= 100 ? 1 : air.usAqi <= 150 ? 2 : 3;
    parts.push(`Aire ${aqiLabel(air.usAqi)}`);
  } else {
    parts.push("Sin dato de aire ahora");
  }
  if (weather?.rainy) { level = Math.max(level, 2) as StatusLevel; parts.push(weather.label.toLowerCase()); }
  else if (weather?.rainSoon) { level = Math.max(level, 2) as StatusLevel; parts.push("posible lluvia en las próximas horas"); }
  if (weather && weather.temp >= 30) { level = Math.max(level, 2) as StatusLevel; parts.push(`${weather.temp} °C`); }
  return { level, reason: parts.join(" · ") };
}

export function recommend(input: EngineInput): Recommendation | null {
  const net = input.network;
  const stops = net.stops;
  const trip = findTrip(net, input.from, input.to);
  if (!trip) return null;

  const first = stops[trip.stopIds[0]];
  const last = stops[trip.stopIds[trip.stopIds.length - 1]];
  const middle = stops[trip.stopIds[Math.floor(trip.stopIds.length / 2)]];
  const peak = isPeak(input.now);

  // Distancias y tiempos: reales por calles (OpenRouteService) si hay; si no, línea recta × 1.2.
  const sw = input.streets?.walk ?? null;
  const sb = input.streets?.bike ?? null;
  const walkM = sw ? sw.m : distanceM(first, last) * 1.2;
  const bikeM = sb ? sb.m : walkM;
  const realNote = "Tiempo por calles reales (OpenStreetMap).";

  // Caminar
  const walkMin = sw ? sw.s / 60 : walkM / 80;
  const walk: ModeOption = {
    id: "walk", title: "Caminar este tramo", subtitle: "Sin pasaje, sin tráfico", icon: "footprints",
    minutes: sw ? [round(walkMin * 0.95), round(walkMin * 1.1)] : [round(walkMin * 0.9), round(walkMin * 1.1)],
    cost: [0, 0],
    kcal: Math.round((walkM / 1000) * 55),
    congestion: "Cero",
    note: sw ? `${realNote} ${(walkM / 1000).toFixed(1)} km.` : undefined,
  };

  // Bici (+2–4 min para sacar y estacionar)
  const bikeMin = sb ? sb.s / 60 : (bikeM / 1000 / 14) * 60;
  const bike: ModeOption = {
    id: "bike", title: "Ir en bici", subtitle: input.hasBike ? "Con tu bici" : "Si tienes bici a la mano", icon: "bike",
    minutes: sb ? [round(bikeMin + 2), round(bikeMin * 1.15 + 4)] : [round(bikeMin * 0.9 + 2), round(bikeMin * 1.2 + 4)],
    cost: [0, 0],
    kcal: Math.round((bikeM / 1000) * 28),
    congestion: "Cero",
    note: sb ? `${realNote} Revisa las ciclovías en el mapa.` : "Revisa las ciclovías del tramo en el mapa.",
  };

  // Scooter eléctrico (propio): misma ruta que la bici, a ~16 km/h
  const scooterMin = (bikeM / 1000 / 16) * 60;
  const scooter: ModeOption = {
    id: "scooter", title: "Ir en scooter", subtitle: input.hasScooter ? "Con tu scooter" : "Si tienes scooter a la mano", icon: "scooter",
    minutes: [round(scooterMin * 0.9 + 2), round(scooterMin * 1.2 + 4)],
    cost: [0, 0],
    kcal: 0,
    congestion: "Cero",
    note: "Eléctrico: no congestiona ni contamina. Usa ciclovía donde haya.",
  };

  // Bus de la red elegida
  const rideKm = (rideDistanceM(net, trip) * 1.05) / 1000;
  const rideMin = (rideKm / (peak ? net.speedKmh[0] : net.speedKmh[1])) * 60;
  // ¿La red está operando ahora? (hora de Lima)
  const limaNow = input.now.toLocaleString("en-GB", { timeZone: "America/Lima", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false });
  const hm = limaNow.slice(-5);
  const closed = !!net.hours && (() => {
    const [a, b] = limaNow.startsWith("Sun") ? net.hours!.sunday : net.hours!.weekday;
    return hm < a || hm >= b;
  })();
  const eta = input.busEta && "minutes" in input.busEta ? input.busEta : null;
  const noMore = !!input.busEta && "none" in input.busEta;
  // Sin dato en vivo: espera según la hora (Rojo) o según su frecuencia real (Expreso: cada 40–90 min).
  const wait: Range = eta ? [eta.minutes, eta.minutes]
    : noMore || closed ? [90, 120]
    : peak ? net.wait.peak : net.wait.off;
  const fare = net.fare;
  const busName = net.busName;
  const bus: ModeOption = {
    id: "bus", title: trip.route.name, subtitle: net.fare === 0 ? "Gratis" : `Ruta ${trip.route.code} · ${trip.route.dirLabel}`, icon: net.kind === "rail" ? "train" : "bus",
    minutes: net.kind === "rail"
      ? [round(rideMin * 0.95 + wait[0] + 3), round(rideMin * 1.05 + wait[1] + 5)] // sin tráfico; +acceso a la estación
      : [round(rideMin * 0.9 + wait[0] + 2), round(rideMin * 1.2 + wait[1] + 5)],
    cost: [fare, fare],
    kcal: 0,
    congestion: net.kind === "rail" ? "Cero" : net.electric ? "Baja" : peak ? "Media" : "Baja",
    note: [
      closed ? `${busName.charAt(0).toUpperCase()}${busName.slice(1)} no opera a esta hora (${net.hours!.label}).`
      : noMore ? "No quedan salidas hoy en esta ruta."
      : eta ? `${net.electric && net.kind === "bus" ? "Eléctrico. " : ""}${eta.source === "live" ? "Próximo bus en" : "Próxima salida programada en"} ${eta.minutes} min`
      : `${net.electric && net.kind === "bus" ? "Eléctrico. " : ""}${net.wait.note}`,
      net.rule,
    ].filter(Boolean).join(" "),
  };

  // Taxi (referencial)
  // El taxi va directo por calle (no sigue la ruta del bus, que puede ser un circuito).
  const taxiKm = (walkM / 1000) * 1.1;
  const taxiMin = (taxiKm / (peak ? 14 : 24)) * 60;
  const taxi: ModeOption = {
    id: "taxi", title: "Taxi / app", subtitle: "Tarifa referencial", icon: "car",
    minutes: [round(taxiMin * 0.9 + 3), round(taxiMin * 1.3 + 8)],
    cost: [roundHalf(Math.max(7, 5 + 1.5 * taxiKm)), roundHalf(Math.max(10, 7 + 2.2 * taxiKm))],
    kcal: 0,
    congestion: peak ? "Alta" : "Media",
  };

  // Beneficios por opción (lo que ganas frente al bus y al taxi)
  const vsBus = fare > 0 ? `Ahorras ${soles(fare)} del pasaje` : null;
  const vsTaxi = `Hasta ${soles(taxi.cost[1])} menos que un taxi`;
  const fasterThanWalk = (o: ModeOption) => {
    const d = Math.round(mid(walk.minutes) - mid(o.minutes));
    return d >= 2 ? `${d} min menos que caminando` : null;
  };
  walk.perks = [vsBus, vsTaxi, `Quemas ≈ ${walk.kcal} kcal`].filter(Boolean) as string[];
  bike.perks = [vsBus, vsTaxi, fasterThanWalk(bike), `Quemas ≈ ${bike.kcal} kcal`].filter(Boolean) as string[];
  scooter.perks = [vsBus, vsTaxi, fasterThanWalk(scooter), "No quema calorías: es eléctrico"].filter(Boolean) as string[];
  bus.perks = [`${solesRange([Math.max(0, taxi.cost[0] - fare), Math.max(0, taxi.cost[1] - fare)])} menos que un taxi`, peak && net.kind === "bus" ? "Hora punta: más tráfico y buses llenos" : null].filter(Boolean) as string[];

  // Decisión
  const status = airStatus(input.air, input.weather);
  const walkOk = status.level < 3 && mid(walk.minutes) <= 60;
  const bikeOk = input.hasBike && status.level < 3 && !input.weather?.rainy && !input.weather?.rainSoon && mid(bike.minutes) <= 60;
  const scooterOk = input.hasScooter && status.level < 3 && !input.weather?.rainy && !input.weather?.rainSoon && mid(scooter.minutes) <= 60;
  const sm = mid(scooter.minutes);
  const fastest = [walkOk ? walk : null, bikeOk ? bike : null, scooterOk ? scooter : null, bus]
    .filter((o): o is ModeOption => !!o)
    .sort((a, b) => mid(a.minutes) - mid(b.minutes))[0];
  const bm = mid(bike.minutes);

  let recommended: Exclude<ModeId, "taxi">;
  let why: string;
  const wm = mid(walk.minutes);
  switch (input.goal) {
    case "rapido":
      recommended = fastest.id as Exclude<ModeId, "taxi">;
      why = recommended === "walk" ? "Caminando llegas antes que esperando el bus."
        : recommended === "bike" ? "En bici llegas antes que en bus, y sin tráfico."
        : recommended === "scooter" ? "En scooter llegas antes que en bus y no sumas un auto más."
        : `Para este tramo, ${busName} te deja antes.`;
      break;
    case "ahorro":
      if (fare === 0) {
        // Bus gratis: todo cuesta S/ 0, gana lo que llegue antes sin auto.
        recommended = bikeOk ? "bike" : scooterOk ? "scooter" : walkOk && wm <= mid(bus.minutes) ? "walk" : "bus";
      } else {
        recommended = walkOk && wm <= 25 ? "walk" : bikeOk ? "bike" : scooterOk ? "scooter" : walkOk && wm <= 45 ? "walk" : "bus";
      }
      why = recommended === "walk"
          ? fare === 0 ? `Caminando llegas antes que en ${busName} y no gastas nada.` : "Es un tramo caminable: te ahorras el pasaje completo."
        : recommended === "bike" ? "En bici te ahorras el pasaje y llegas más rápido que caminando."
        : recommended === "scooter" ? "En scooter te ahorras el pasaje y no congestionas."
        : fare === 0 ? `${busName.charAt(0).toUpperCase()}${busName.slice(1)} te deja antes, y es gratis y eléctrico.` : `El tramo es largo para caminar; ${busName} es la opción más barata.`;
      break;
    case "trafico":
      recommended = bikeOk && bm <= mid(bus.minutes) + 10 ? "bike" : scooterOk && sm <= mid(bus.minutes) + 10 ? "scooter" : walkOk && wm <= (peak ? 50 : 35) ? "walk" : "bus";
      why = recommended === "bike" ? "En bici esquivas el tráfico y no sumas un auto más."
        : recommended === "scooter" ? "En scooter esquivas el tráfico y no sumas un auto más."
        : recommended === "walk" ? (peak ? "Es hora punta: caminando no dependes del tráfico." : "Caminando no sumas al tráfico.")
        : `El tramo es largo para caminar; ${busName} evita el taxi en el tráfico.`;
      break;
    default:
      recommended = walkOk && wm <= 60 ? "walk" : bikeOk ? "bike" : scooterOk ? "scooter" : "bus";
      why = recommended === "walk" ? "Moverte te hace bien y el aire lo permite."
        : recommended === "bike" ? "El tramo es largo a pie, pero en bici te mueves igual."
        : recommended === "scooter" ? "El tramo es largo a pie; en scooter llegas sin tráfico."
        : "Hoy mejor no caminar este tramo completo.";
  }
  if (!walkOk && status.level === 3 && recommended === "bus") why = "La calidad del aire no está para caminar ahora.";
  if (recommended === "bus" && (closed || noMore)) {
    why = closed
      ? `Ojo: ${busName} no opera a esta hora (${net.hours!.label}). Es la mejor opción cuando vuelva a funcionar.`
      : `Ojo: ya no quedan salidas hoy en esta ruta. Es la mejor opción para mañana.`;
  }

  // Qué cambió en la recomendación por el aire o el clima (lo que el banner debe decir).
  const uvNow = input.weather?.uvNow ?? 0;
  const effect = status.unknown ? "Sin datos de clima ni aire: la recomendación usa tiempos estimados."
    : status.level === 3 ? "Por el aire de ahora, YIO no te recomienda caminar ni pedalear."
    : (input.weather?.rainy || input.weather?.rainSoon) && (input.hasBike || input.hasScooter) ? "Por la lluvia, YIO no te sugiere bici ni scooter ahora."
    : input.weather && input.weather.temp >= 30 ? "Hace calor: si caminas, lleva agua y busca sombra."
    : uvNow >= 8 && recommended === "walk" ? "Caminar es buena opción, pero cuídate del sol: el UV está muy alto."
    : status.level === 2 ? "Se puede caminar, con cuidado."
    : "Buen momento para caminar o pedalear.";

  const rec = { walk, bike, scooter, bus }[recommended];
  const active = recommended !== "bus";
  const savings: Range =
    active ? [fare, taxi.cost[1]]
    : [Math.max(0, taxi.cost[0] - fare), Math.max(0, taxi.cost[1] - fare)];

  // Cómo se llega al ahorro de hoy, en palabras.
  const modeName = { walk: "caminando", bike: "en bici", scooter: "en scooter", bus: "" }[recommended];
  const savingsHow: string[] = active
    ? [
        `Vas ${modeName}: tu viaje cuesta S/ 0.`,
        fare > 0 ? `Frente ${busName.startsWith("el ") ? "al " + busName.slice(3) : "a " + busName}: ahorras el pasaje, ${soles(fare)}.` : `${busName.charAt(0).toUpperCase()}${busName.slice(1)} es gratis, así que frente a él no hay diferencia.`,
        `Frente a un taxi (${solesRange(taxi.cost)} por ${taxiKm.toFixed(1)} km): ahorras hasta ${soles(taxi.cost[1])}.`,
      ]
    : [
        `Un taxi por este tramo (${taxiKm.toFixed(1)} km) cuesta ${solesRange(taxi.cost)}.`,
        fare > 0 ? `En ${busName} pagas ${soles(fare)}.` : `${busName.charAt(0).toUpperCase()}${busName.slice(1)} es gratis.`,
        `Diferencia: ${solesRange(savings)}.`,
      ];

  const monthly: Range = [savings[0] * 20, savings[1] * 20];
  const walkKm = walkM / 1000;

  return {
    createdAt: input.now.toISOString(),
    status,
    route: {
      from: input.from, via: middle.place, to: input.to, routeLabel: trip.route.loop ? `${net.name} · ${trip.route.code}` : net.kind === "rail" ? `${net.name} · ${trip.route.dirLabel}` : `${net.name} · Ruta ${trip.route.code} · ${trip.route.dirLabel}`,
      note: `${trip.stopIds.length - 1} ${net.kind === "rail" ? "estaciones" : "paraderos"}`,
    },
    options: [walk, bike, scooter, bus, taxi],
    recommended,
    why,
    savings,
    savingsHow,
    today: [
      { label: { walk: "Duración caminando", bike: "Duración en bici", scooter: "Duración en scooter", bus: "Duración del viaje" }[recommended], value: minRange(rec.minutes), icon: "clock", tone: "info" },
      { label: "Ahorro hoy", value: solesRange(savings), icon: "dollar", tone: "success" },
      { label: "Congestión generada", value: rec.congestion, icon: "car", tone: "highlight" },
    ],
    impact: {
      intro: "Si repites esta decisión 20 días/mes:",
      stats: [
        { label: "Ahorro", value: solesRange([Math.round(monthly[0]), Math.round(monthly[1])]).replace(/\.00/g, ""), icon: "dollar", tone: "success" },
        active && rec.kcal > 0
          ? { label: "Energía", value: `≈ ${(rec.kcal * 20).toLocaleString("es-PE")} kcal`, icon: "zap", tone: "energy" }
          : active
          ? { label: "Viajes sin auto", value: "20 viajes", icon: "scooter", tone: "energy" }
          : { label: "Viajes en transporte público", value: "20 viajes", icon: "bus", tone: "energy" },
        active
          ? { label: { walk: "Distancia caminada", bike: "Distancia en bici", scooter: "Distancia en scooter", bus: "" }[recommended], value: `≈ ${Math.round(walkKm * 20)} km`, icon: recommended === "walk" ? "footprints" : recommended === "bike" ? "bike" : "scooter", tone: "highlight" }
          : { label: "Tiempo extra vs. taxi", value: `≈ ${Math.max(0, Math.round(((mid(bus.minutes) - mid(taxi.minutes)) * 20) / 60))} h al mes`, icon: "clock", tone: "highlight" },
      ],
      equivalences: [
        `${Math.floor(mid(monthly) / 12)} menús de almuerzo`,
        `${Math.floor(mid(monthly) / REF_FARE)} pasajes de bus`,
      ],
    },
    quote: quotes[input.goal][input.now.getDate() % quotes[input.goal].length],
    goal: input.goal,
    bikePath: input.streets?.bike?.path,
    conditions: {
      air: input.air ? aqiLabel(input.air.usAqi) : undefined,
      uv: input.weather ? {
        value: Math.round(input.weather.uvNow),
        label: uvLabel(input.weather.uvNow),
        advice: input.weather.uvNow >= 8 ? "Si caminas: gorra, bloqueador y vereda con sombra."
          : input.weather.uvNow >= 6 ? "Si caminas: gorra y bloqueador." : undefined,
      } : undefined,
      bestHour: bestWalkHour(input.weather, input.air),
      effect,
    },
    body: (() => {
      const m: "walk" | "bike" = recommended === "bike" ? "bike" : "walk";
      const o = m === "bike" ? bike : walk;
      const activeMin = Math.round(mid(o.minutes));
      return {
        mode: m, recommended: recommended === m, activeMin,
        weeklyPct: Math.round((activeMin / 150) * 100),
        steps: m === "walk" ? Math.round(walkM / 0.75 / 100) * 100 : undefined,
        kcal: o.kcal,
      };
    })(),
    path: trip.stopIds.map((id) => ({ lat: stops[id].lat, lng: stops[id].lng, name: stops[id].place })),
    live: !!eta && eta.source === "live",
  };
}
