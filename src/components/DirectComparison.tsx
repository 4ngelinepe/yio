import { BadgeCheck } from "lucide-react";
import type { ModeOption, Recommendation } from "../data/content";
import { minRange, solesRange } from "../lib/engine";
import { cx } from "../lib/tones";
import { Icon } from "./ui/Icon";
import { Card, IconTile } from "./ui/primitives";

function Option({ o, recommended }: { o: ModeOption; recommended: boolean }) {
  const rows = [
    { label: "Duración", value: minRange(o.minutes), icon: "clock" as const },
    { label: "Costo", value: o.cost[1] === 0 ? "S/ 0.00" : solesRange(o.cost), icon: "dollar" as const },
    { label: "Congestión generada", value: o.congestion, icon: "alert" as const, warn: o.congestion === "Alta" },
    { label: "Calorías", value: `${o.kcal} kcal`, icon: "flame" as const },
  ];
  return (
    <article
      className={cx(
        "relative rounded-card p-6",
        recommended ? "border-2 border-success-border bg-success-soft" : "border border-line bg-surface-muted",
      )}
    >
      {recommended && (
        <span className="absolute -top-4 right-4 inline-flex items-center gap-2 rounded-full bg-success px-4 py-1.5 text-sm text-white shadow-card">
          <BadgeCheck className="size-4" /> Recomendado hoy
        </span>
      )}
      <header className="flex items-center gap-4">
        <IconTile icon={o.icon} tone={recommended ? "success" : "neutral"} />
        <div>
          <h3 className={cx("text-lg", recommended ? "text-success-text" : "text-ink")}>{o.title}</h3>
          <p className={recommended ? "text-success-text opacity-80" : "text-muted"}>{o.subtitle}</p>
        </div>
      </header>
      <dl className="mt-6 space-y-4">
        {rows.map((r) => (
          <div key={r.label} className="flex gap-4">
            <Icon name={r.icon} className={cx("mt-0.5 size-5 shrink-0", r.warn ? "text-warning" : recommended ? "text-success" : "text-muted")} />
            <div>
              <dt className={cx("text-sm", recommended ? "text-success-text" : "text-muted")}>{r.label}</dt>
              <dd className={cx("text-lg", r.warn ? "text-warning-text" : "text-ink")}>{r.value}</dd>
            </div>
          </div>
        ))}
      </dl>
      {o.note && <p className="mt-4 text-sm text-muted">{o.note}</p>}
    </article>
  );
}

export function DirectComparison({ data }: { data: Recommendation }) {
  const ordered = [...data.options].sort((a, b) => (a.id === data.recommended ? -1 : b.id === data.recommended ? 1 : 0));
  return (
    <Card className="p-6 sm:p-10" labelledBy="compare-title">
      <h2 id="compare-title" className="text-xl text-ink">Comparación directa</h2>
      <div className="mt-8 grid gap-8 lg:grid-cols-3 lg:gap-5">
        {ordered.map((o) => <Option key={o.id} o={o} recommended={o.id === data.recommended} />)}
      </div>
      <p className="mt-6 text-sm text-subtle">
        Tiempos y costos estimados. Pasaje del Corredor Rojo S/ 2.43; tarifa de taxi referencial.
      </p>
    </Card>
  );
}
