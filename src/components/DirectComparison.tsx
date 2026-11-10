import { BadgeCheck } from "lucide-react";
import type { CompareRow, Recommendation } from "../data/content";
import { cx, tone as tones } from "../lib/tones";
import { Icon } from "./ui/Icon";
import { Card, IconTile } from "./ui/primitives";

function Rows({ rows, labelClass, iconClass }: { rows: CompareRow[]; labelClass: string; iconClass: string }) {
  return (
    <dl className="mt-6 space-y-5">
      {rows.map((r) => {
        const t = r.tone ? tones[r.tone] : null;
        return (
          <div key={r.label} className="flex gap-4">
            <Icon name={r.icon} className={cx("mt-0.5 size-6 shrink-0", t ? t.fg : iconClass)} />
            <div>
              <dt className={cx("text-sm", labelClass)}>{r.label}</dt>
              <dd className={cx("text-lg", t ? t.text : "text-ink")}>{r.value}</dd>
            </div>
          </div>
        );
      })}
    </dl>
  );
}

export function DirectComparison({ data }: { data: Recommendation["compare"] }) {
  const { alternative: alt, recommended: rec } = data;
  return (
    <Card className="p-6 sm:p-10" labelledBy="compare-title">
      <h2 id="compare-title" className="text-xl text-ink">Comparación directa</h2>

      <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-6">
        {/* Alternativa */}
        <article className="rounded-card border border-line bg-surface-muted p-6 sm:p-8">
          <header className="flex items-center gap-4">
            <IconTile icon="car" tone="neutral" />
            <div>
              <h3 className="text-lg text-ink">{alt.title}</h3>
              <p className="text-muted">{alt.subtitle}</p>
            </div>
          </header>
          <Rows rows={alt.rows} labelClass="text-muted" iconClass="text-muted" />
        </article>

        {/* Recomendada */}
        <article className="relative rounded-card border-2 border-success-border bg-success-soft p-6 sm:p-8">
          <span className="absolute -top-4 right-4 inline-flex items-center gap-2 rounded-full bg-success px-4 py-1.5 text-sm text-white shadow-card">
            <BadgeCheck className="size-4" /> {rec.badge}
          </span>
          <header className="flex items-center gap-4">
            <IconTile icon="footprints" tone="success" />
            <div>
              <h3 className="text-lg text-success-text">{rec.title}</h3>
              <p className="text-success-text opacity-80">{rec.subtitle}</p>
            </div>
          </header>
          <Rows rows={rec.rows} labelClass="text-success-text" iconClass="text-success" />
        </article>
      </div>
    </Card>
  );
}
