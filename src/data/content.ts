/**
 * Contenido de ejemplo (mock). Todo el texto y los números de la app salen de aquí.
 * Cuando exista backend, reemplazar getRecommendation() por una llamada a la API
 * que devuelva la misma forma (tipo Recommendation).
 */
import type { Tone } from "../lib/tones";

export type GoalId = "rapido" | "ahorro" | "trafico" | "bienestar";
export type IconName =
  | "zap" | "piggy" | "traffic" | "sparkles" | "clock" | "dollar" | "car"
  | "alert" | "flame" | "footprints" | "wind" | "sun" | "trend";

export const weather = { city: "Lima, Perú", temp: "23°C", condition: "Despejado" };

export const goals: { id: GoalId; label: string; icon: IconName }[] = [
  { id: "rapido", label: "Moverme rápido", icon: "zap" },
  { id: "ahorro", label: "Ahorrar plata", icon: "piggy" },
  { id: "trafico", label: "Evitar tráfico", icon: "traffic" },
  { id: "bienestar", label: "Sentirme mejor", icon: "sparkles" },
];

export type StatusLevel = 1 | 2 | 3;
export const statusLevels: Record<StatusLevel, { label: string; tone: Tone; text: string }> = {
  1: { label: "Respirable", tone: "success", text: "Este corredor es conveniente para caminar hoy." },
  2: { label: "Moderado", tone: "warning", text: "Se puede caminar, con algo de tráfico y ruido." },
  3: { label: "Evitar", tone: "danger", text: "Hoy conviene otra alternativa para este tramo." },
};

export type Stat = { label: string; value: string; icon: IconName; tone: Tone };
export type CompareRow = { label: string; value: string; icon: IconName; tone?: Tone };

export type Recommendation = {
  status: StatusLevel;
  route: { from: string; via: string; to: string; note: string };
  today: Stat[];
  compare: {
    alternative: { title: string; subtitle: string; rows: CompareRow[] };
    recommended: { title: string; subtitle: string; badge: string; rows: CompareRow[] };
  };
  impact: { intro: string; stats: Stat[]; equivalences: string[] };
  quote: string;
};

const base: Recommendation = {
  status: 1,
  route: { from: "Aramburú", via: "Larco", to: "Malecón", note: "tramo fluido" },
  today: [
    { label: "Duración caminando", value: "18–24 min", icon: "clock", tone: "info" },
    { label: "Ahorro hoy", value: "S/ 3.50 – S/ 7.00", icon: "dollar", tone: "success" },
    { label: "Congestión generada", value: "0", icon: "car", tone: "highlight" },
  ],
  compare: {
    alternative: {
      title: "Taxi / Bus",
      subtitle: "Alternativa motorizada",
      rows: [
        { label: "Duración", value: "34–47 min", icon: "clock" },
        { label: "Costo", value: "S/ 4.00 – S/ 12.00", icon: "dollar" },
        { label: "Congestión", value: "Alta congestión", icon: "alert", tone: "warning" },
        { label: "Calorías", value: "0 calorías", icon: "flame" },
      ],
    },
    recommended: {
      title: "Caminar este tramo",
      subtitle: "Opción recomendada",
      badge: "Recomendado hoy",
      rows: [
        { label: "Duración", value: "22–27 min", icon: "clock" },
        { label: "Ahorro en 20 días", value: "S/ 90.00", icon: "dollar" },
        { label: "Calorías quemadas", value: "200 calorías", icon: "flame" },
        { label: "Congestión generada", value: "0 congestión", icon: "alert" },
      ],
    },
  },
  impact: {
    intro: "Si repites esta decisión 20 días/mes:",
    stats: [
      { label: "Ahorro", value: "S/ 70 – S/ 140", icon: "dollar", tone: "success" },
      { label: "Energía", value: "≈ 3,200 kcal", icon: "zap", tone: "energy" },
      { label: "Tráfico evitado", value: "4–6 horas", icon: "clock", tone: "highlight" },
    ],
    equivalences: ["1 noche de viaje", "1 mes de fondo de tranquilidad"],
  },
  quote: "Caminar este corredor no solo ahorra. También ordena tu cabeza.",
};

/** Variaciones por objetivo: solo se sobrescribe lo que cambia. */
const byGoal: Record<GoalId, Partial<Recommendation>> = {
  rapido: {},
  ahorro: {
    quote: "Cada tramo caminado es plata que se queda contigo.",
  },
  trafico: {
    status: 2,
    route: { from: "Aramburú", via: "Benavides", to: "Malecón", note: "evita Larco en hora punta" },
    quote: "El tráfico no se negocia. Se esquiva.",
  },
  bienestar: {
    route: { from: "Aramburú", via: "Parque Kennedy", to: "Malecón", note: "ruta con sombra" },
    quote: "Veinte minutos caminando también son veinte minutos para ti.",
  },
};

export function getRecommendation(goal: GoalId): Recommendation {
  return { ...base, ...byGoal[goal] };
}

export const menuLinks = ["Inicio", "Mis ahorros", "Historial", "Configuración"];
export const footerLinks = ["Acerca", "Contacto", "Créditos"];
