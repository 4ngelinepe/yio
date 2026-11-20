import { Check, ChevronRight } from "lucide-react";
import type { Recommendation } from "../data/content";
import { minRange, solesRange } from "../lib/engine";
import type { BikeCoverage } from "../lib/bikes";
import { Card, IconTile } from "./ui/primitives";

export const coverageText = (c: BikeCoverage) =>
  c.pct === 0 ? "Esta ruta no pasa por ciclovías"
  : `${c.pct}% por ciclovía${c.names.length ? ` (${c.names.join(", ")})` : ""}`;

/** Otras formas de hacer el mismo viaje: una fila por opción; el detalle se abre al tocarla. */
export function DirectComparison({ data, bikeCov }: { data: Recommendation; bikeCov?: BikeCoverage | null }) {
  const legs = data.roundTrip ? 2 : 1;
  const others = data.options.filter((o) => o.id !== data.recommended);
  const rec = data.options.find((o) => o.id === data.recommended);
  return (
    <Card className="p-6 sm:p-10" labelledBy="compare-title">
      <h2 id="compare-title" className="text-lg text-ink">Otras formas de ir</h2>
      <ul className="mt-4 space-y-3">
        {others.map((o) => {
          const cost: [number, number] = [o.cost[0] * legs, o.cost[1] * legs];
          const kcal = o.id === "scooter" ? 0 : o.kcal * legs;
          return (
            <li key={o.id}>
              <details className="group rounded-tile border border-line bg-surface">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                  <IconTile icon={o.icon} tone="neutral" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-ink">{o.title}</span>
                    <span className="block text-xs text-muted">
                      {minRange(o.minutes)} · {cost[1] === 0 ? "S/ 0" : solesRange(cost)}{legs === 2 ? " ida y vuelta" : ""}{kcal > 0 ? ` · ≈ ${kcal} kcal` : ""}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-subtle transition group-open:rotate-90" aria-hidden />
                </summary>
                <div className="border-t border-line px-4 py-3 text-sm">
                  <p className="text-muted">{o.subtitle}</p>
                  {(() => {
                    const perks = bikeCov && (o.id === "bike" || o.id === "scooter") ? [coverageText(bikeCov), ...(o.perks ?? [])] : o.perks;
                    return perks && perks.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {perks.map((t) => <li key={t} className="flex gap-2 text-ink"><Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />{t}</li>)}
                      </ul>
                    );
                  })()}
                  {o.note && <p className="mt-2 text-muted">{o.note}</p>}
                  {o.congestion === "Alta" && <p className="mt-2 text-warning-text">Suma tráfico: congestión alta.</p>}
                </div>
              </details>
            </li>
          );
        })}
      </ul>
      {rec?.note && (
        <details className="mt-4 text-sm text-muted">
          <summary className="cursor-pointer select-none text-primary">Detalle de la opción recomendada</summary>
          <p className="mt-2">{rec.subtitle}. {rec.note}</p>
        </details>
      )}
      <p className="mt-4 text-xs text-subtle">Tiempos y costos estimados. Pasaje según la tarifa de cada corredor; tarifa de taxi referencial.</p>
    </Card>
  );
}
