/**
 * Textos fijos y tipos de la app. Los números salen del motor (src/lib/engine.ts).
 */
import type { Tone } from "../lib/tones";

export type GoalId = "rapido" | "ahorro" | "trafico" | "bienestar";
export type IconName =
  | "zap" | "piggy" | "traffic" | "sparkles" | "clock" | "dollar" | "car" | "bus" | "bike" | "scooter"
  | "train" | "alert" | "flame" | "footprints" | "wind" | "sun" | "cloud" | "rain" | "trend";

export const goals: { id: GoalId; label: string; icon: IconName }[] = [
  { id: "rapido", label: "Llegar rápido", icon: "zap" },
  { id: "ahorro", label: "Ahorrar plata", icon: "piggy" },
  { id: "bienestar", label: "Moverme más", icon: "footprints" },
];

export type StatusLevel = 1 | 2 | 3;
export const statusLevels: Record<StatusLevel, { label: string; tone: Tone }> = {
  1: { label: "Respirable", tone: "success" },
  2: { label: "Moderado", tone: "warning" },
  3: { label: "Evitar", tone: "danger" },
};

export type Range = [number, number];
export type ModeId = "walk" | "bike" | "scooter" | "bus" | "taxi";

export type ModeOption = {
  id: ModeId;
  title: string;
  subtitle: string;
  icon: IconName;
  minutes: Range;
  cost: Range;
  kcal: number;
  congestion: "Cero" | "Baja" | "Media" | "Alta";
  note?: string;
  /** Beneficios destacados de esta opción: "Ahorras S/ 2.43", "8 min menos que caminando". */
  perks?: string[];
};

export type Stat = { label: string; value: string; icon: IconName; tone: Tone; rows?: { label: string; value: string }[] };

export type Recommendation = {
  createdAt: string;
  status: { level: StatusLevel; reason: string; unknown?: boolean };
  route: { from: string; via: string; to: string; note: string; routeLabel: string };
  options: ModeOption[];
  recommended: ModeId;
  why: string;
  savings: Range; // soles ahorrados por viaje frente a la alternativa más cara razonable
  savingsHow: string[]; // cómo se calcula el ahorro, en frases cortas
  today: Stat[];
  impact: { intro: string; stats: Stat[]; equivalences: string[] };
  quote: string;
  goal: GoalId;
  /** Ruta real en bici por calles ([lat, lng]), si hay. */
  bikePath?: [number, number][];
  /** Condiciones del día traducidas a decisiones. */
  conditions: {
    air?: string;
    uv?: { value: number; label: string; advice?: string };
    bestHour?: { hour: string; why: string; now: boolean };
    /** Qué cambió en la recomendación por el clima o el aire. */
    effect: string;
  };
  /** Movimiento del tramo (si caminas o pedaleas). */
  body: { mode: "walk" | "bike"; recommended: boolean; activeMin: number; weeklyPct: number; steps?: number; kcal: number };
  path: { lat: number; lng: number; name: string }[];
  live: boolean;
  /** Tramo sin bus: el recorrido del mapa es la ruta a pie. */
  noBus?: boolean;
  /** Sin bus, sin bici y más de 75 min a pie: no hay una buena opción en YIO. */
  tooFar?: boolean;
  /** CO₂ que no emitiste frente a lo de siempre, en kg (ya incluye ida y vuelta). */
  co2?: number;
  /** Cómo hace la persona este tramo normalmente (base del ahorro). */
  usual?: "bus" | "taxi" | "auto" | "walk";
  /** Si el ahorro, los km y la energía cuentan ida y vuelta. */
  roundTrip?: boolean;
  /** Distancia del viaje recomendado, en km (por dos si es ida y vuelta). */
  km?: number;
  /** Biciestacionamiento sugerido (bici + bus o Metro, o junto al paradero de subida). */
  parking?: { lat: number; lng: number; m: number; label: string };
};

export const quotes: Record<GoalId, string[]> = {
  rapido: ["Llegar bien también es dejar la pista más libre para todos.", "Cada decisión de viaje mueve a toda la ciudad."],
  ahorro: ["Lo que ahorras tú, también lo respira Lima.", "Un pasaje menos es un auto menos en la pista."],
  trafico: ["Un auto menos es una calle mejor para todos.", "El tráfico lo hacemos entre todos. La salida también."],
  bienestar: ["Cuando caminas, te haces bien y le haces bien a la ciudad.", "Tu bienestar y el de Lima van por la misma vereda."],
};

export const menuLinks = [
  { label: "Inicio", href: "#" },
  { label: "Mis ahorros", href: "#mis-ahorros" },
];
export const footerLinks = ["Acerca", "Contacto", "Créditos"];
