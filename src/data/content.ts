/**
 * Textos fijos y tipos de la app. Los números salen del motor (src/lib/engine.ts).
 */
import type { Tone } from "../lib/tones";

export type GoalId = "rapido" | "ahorro" | "trafico" | "bienestar";
export type IconName =
  | "zap" | "piggy" | "traffic" | "sparkles" | "clock" | "dollar" | "car" | "bus"
  | "alert" | "flame" | "footprints" | "wind" | "sun" | "cloud" | "rain" | "trend";

export const goals: { id: GoalId; label: string; icon: IconName }[] = [
  { id: "rapido", label: "Moverme rápido", icon: "zap" },
  { id: "ahorro", label: "Ahorrar plata", icon: "piggy" },
  { id: "trafico", label: "Evitar tráfico", icon: "traffic" },
  { id: "bienestar", label: "Sentirme mejor", icon: "sparkles" },
];

export type StatusLevel = 1 | 2 | 3;
export const statusLevels: Record<StatusLevel, { label: string; tone: Tone }> = {
  1: { label: "Respirable", tone: "success" },
  2: { label: "Moderado", tone: "warning" },
  3: { label: "Evitar", tone: "danger" },
};

export type Range = [number, number];
export type ModeId = "walk" | "bus" | "taxi";

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
};

export type Stat = { label: string; value: string; icon: IconName; tone: Tone };

export type Recommendation = {
  createdAt: string;
  status: { level: StatusLevel; reason: string };
  route: { from: string; via: string; to: string; note: string; routeLabel: string };
  options: ModeOption[];
  recommended: ModeId;
  why: string;
  savings: Range; // soles ahorrados por viaje frente a la alternativa más cara razonable
  today: Stat[];
  impact: { intro: string; stats: Stat[]; equivalences: string[] };
  quote: string;
  path: { lat: number; lng: number; name: string }[];
  live: boolean;
};

export const quotes: Record<GoalId, string[]> = {
  rapido: ["Llegar rápido también es saber cuándo no subirse.", "A veces el atajo es caminar."],
  ahorro: ["Cada tramo caminado es plata que se queda contigo.", "El pasaje que no pagas también cuenta."],
  trafico: ["El tráfico no se negocia. Se esquiva.", "Javier Prado no te va a esperar. Tú tampoco a él."],
  bienestar: ["Caminar este corredor no solo ahorra. También ordena tu cabeza.", "Veinte minutos caminando también son veinte minutos para ti."],
};

export const menuLinks = [
  { label: "Inicio", href: "#" },
  { label: "Mis ahorros", href: "#mis-ahorros" },
];
export const footerLinks = ["Acerca", "Contacto", "Créditos"];
