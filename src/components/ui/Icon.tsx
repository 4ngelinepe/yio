import {
  Car, Clock, DollarSign, Flame, Footprints, PiggyBank, Sparkles, Sun,
  TrafficCone, TrendingUp, TriangleAlert, Wind, Zap, type LucideProps,
} from "lucide-react";
import type { IconName } from "../../data/content";

const map = {
  zap: Zap, piggy: PiggyBank, traffic: TrafficCone, sparkles: Sparkles,
  clock: Clock, dollar: DollarSign, car: Car, alert: TriangleAlert,
  flame: Flame, footprints: Footprints, wind: Wind, sun: Sun, trend: TrendingUp,
} satisfies Record<IconName, unknown>;

export function Icon({ name, ...props }: { name: IconName } & LucideProps) {
  const C = map[name];
  return <C aria-hidden strokeWidth={1.75} {...props} />;
}
