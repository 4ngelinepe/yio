import { statusLevels, type Recommendation } from "../data/content";
import { cx, tone as tones } from "../lib/tones";
import { IconTile } from "./ui/primitives";

const TEXT = {
  1: "Las condiciones están bien para caminar hoy.",
  2: "Se puede caminar, pero con cuidado.",
  3: "Hoy no conviene caminar este tramo.",
} as const;

export function CorridorStatus({ status }: { status: Recommendation["status"] }) {
  const s = statusLevels[status.level];
  const t = tones[s.tone];
  return (
    <section aria-live="polite" className={cx("rounded-card border-2 p-6 shadow-card sm:p-10", t.soft, t.border)}>
      <div className="flex items-center gap-6">
        <IconTile icon="wind" tone={s.tone} size="lg" />
        <div className="min-w-0 flex-1">
          <p className={cx("text-sm sm:text-base", t.text)}>Estado para caminar</p>
          <p className={cx("font-display text-4xl font-medium uppercase tracking-tight sm:text-6xl", t.text)}>{s.label}</p>
          <p className={cx("mt-2", t.text)}>{TEXT[status.level]}</p>
          <p className={cx("mt-1 text-sm opacity-80", t.text)}>{status.reason}</p>
        </div>
        <div className="hidden gap-2 sm:flex" aria-label={`Nivel ${status.level} de 3`}>
          {([1, 2, 3] as const).map((n) => (
            <span key={n} className={cx("size-4 rounded-full", n === status.level ? t.solid : "bg-line")} />
          ))}
        </div>
      </div>
    </section>
  );
}
