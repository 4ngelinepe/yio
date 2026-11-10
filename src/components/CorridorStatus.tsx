import { statusLevels, type StatusLevel } from "../data/content";
import { cx, tone as tones } from "../lib/tones";
import { IconTile } from "./ui/primitives";

export function CorridorStatus({ level }: { level: StatusLevel }) {
  const s = statusLevels[level];
  const t = tones[s.tone];
  return (
    <section
      aria-live="polite"
      className={cx("rounded-card border-2 p-6 shadow-card sm:p-10", t.soft, t.border)}
    >
      <div className="flex items-center gap-6">
        <IconTile icon="wind" tone={s.tone} size="lg" />
        <div className="min-w-0 flex-1">
          <p className={cx("text-sm sm:text-base", t.text)}>Estado del corredor</p>
          <p className={cx("font-display text-4xl font-medium uppercase tracking-tight sm:text-6xl", t.text)}>
            {s.label}
          </p>
          <p className={cx("mt-2", t.text)}>{s.text}</p>
        </div>
        {/* Semáforo: 3 niveles */}
        <div className="hidden gap-2 sm:flex" aria-label={`Nivel ${level} de 3`}>
          {([1, 2, 3] as const).map((n) => (
            <span
              key={n}
              className={cx("size-4 rounded-full", n === level ? t.solid : "bg-line")}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
