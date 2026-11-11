import { BadgeCheck, Check } from "lucide-react";
import type { ModeOption, Recommendation } from "../data/content";
import { minRange, solesRange } from "../lib/engine";
import { cx } from "../lib/tones";
import type { BikeCoverage } from "../lib/bikes";
import { Icon } from "./ui/Icon";
import { Card, IconTile } from "./ui/primitives";

export const coverageText = (c: BikeCoverage) =>
  c.pct === 0 ? "Esta ruta no pasa por ciclovías"
  : `${c.pct}% por ciclovía${c.names.length ? ` (${c.names.join(", ")})` : ""}`;

function Option({ o, recommended, extra }: { o: ModeOption; recommended: boolean; extra?: string }) {
  const perks = extra ? [extra, ...(o.perks ?? [])] : o.perks;
  const rows = [
    { label: "Duración", value: minRange(o.minutes), icon: "clock" as const },
    { label: "Costo", value: o.cost[1] === 0 ? "S/ 0.00" : solesRange(o.cost), icon: "dollar" as const },
    { label: "Congestión generada", value: o.congestion, icon: "alert" as const, warn: o.congestion === "Alta" },
    { label: "Calorías", value: o.id === "scooter" ? "0 kcal (eléctrico)" : `${o.kcal} kcal`, icon: "flame" as const },
  ];
  return (
    <article
      className={cx(
        "relative rounded-card p-5 pt-6",
        recommended ? "border-2 border-success-border bg-success-soft" : "border border-line bg-surface-muted",
      )}
    >
      {recommended && (
        <span className="absolute -top-3.5 left-4 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-success px-3 py-1 text-xs text-white shadow-card">
          <BadgeCheck className="size-4" /> Recomendado hoy
        </span>
      )}
      <header className="flex flex-col items-start gap-2">
        <IconTile icon={o.icon} tone={recommended ? "success" : "neutral"} />
        <div>
          <h3 className={cx("text-lg", recommended ? "text-success-text" : "text-ink")}>{o.title}</h3>
          <p className={recommended ? "text-success-text opacity-80" : "text-muted"}>{o.subtitle}</p>
        </div>
      </header>
      {perks && perks.length > 0 && (
        <ul className="mt-4 space-y-1.5 text-sm">
          {perks.map((t) => (
            <li key={t} className={cx("flex gap-2", recommended ? "text-success-text" : "text-ink")}>
              <Check className={cx("mt-0.5 size-4 shrink-0", recommended ? "text-success" : "text-primary")} aria-hidden />
              {t}
            </li>
          ))}
        </ul>
      )}
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

export function DirectComparison({ data, bikeCov }: { data: Recommendation; bikeCov?: BikeCoverage | null }) {
  const ordered = [...data.options].sort((a, b) => (a.id === data.recommended ? -1 : b.id === data.recommended ? 1 : 0));
  return (
    <Card className="p-6 sm:p-10" labelledBy="compare-title">
      <h2 id="compare-title" className="text-xl text-ink">Comparación directa</h2>
      <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-5 xl:grid-cols-5 xl:gap-4">
        {ordered.map((o) => (
          <Option key={o.id} o={o} recommended={o.id === data.recommended}
            extra={bikeCov && (o.id === "bike" || o.id === "scooter") ? coverageText(bikeCov) : undefined} />
        ))}
      </div>
      <p className="mt-6 text-sm text-subtle">
        Tiempos y costos estimados. Pasaje según la tarifa de cada corredor; tarifa de taxi referencial.
      </p>
    </Card>
  );
}
