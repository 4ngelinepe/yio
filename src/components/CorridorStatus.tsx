import { statusLevels, type Recommendation } from "../data/content";
import { cx, tone as tones } from "../lib/tones";
import { Icon } from "./ui/Icon";
import { IconTile } from "./ui/primitives";

/**
 * Estado del día, traducido a decisiones.
 * - En "Moverme más": tarjeta completa "Hoy para tu cuerpo" (aire, sol, mejor hora, tu movimiento).
 * - En las demás metas: una franja compacta que no le quita protagonismo a la recomendación.
 */
export function CorridorStatus({ data }: { data: Recommendation }) {
  const { status, conditions: c, body, goal } = data;

  if (status.unknown) {
    return (
      <section aria-live="polite" className="rounded-card border border-line bg-surface-muted p-5 text-sm text-muted">
        {c.effect}
      </section>
    );
  }

  const s = statusLevels[status.level];
  const t = tones[s.tone];
  const parts = [
    c.air && `Aire ${c.air}`,
    c.uv && `UV ${c.uv.label} (${c.uv.value})`,
    c.bestHour && (c.bestHour.now ? "Buen momento para caminar" : `Mejor hora para caminar: ${c.bestHour.hour}`),
  ].filter(Boolean) as string[];

  if (goal !== "bienestar") {
    return (
      <section aria-live="polite" className={cx("flex items-start gap-3 rounded-card border p-4 sm:p-5", t.soft, t.border)}>
        <Icon name="wind" className={cx("mt-0.5 size-5 shrink-0", t.fg)} />
        <div className={cx("text-sm", t.text)}>
          <p className="font-medium">{c.effect}</p>
          <p className="mt-0.5 opacity-80">{parts.join(" · ")}</p>
        </div>
      </section>
    );
  }

  const bodyLabel = body.mode === "walk" ? "caminando" : "en bici";
  const tiles = [
    { icon: "wind" as const, title: "Aire", value: c.air ? c.air.charAt(0).toUpperCase() + c.air.slice(1) : "Sin dato", note: s.label.toLowerCase() === "respirable" ? "Bien para moverte al aire libre" : status.reason },
    { icon: "sun" as const, title: "Sol", value: c.uv ? `UV ${c.uv.label}` : "Sin dato", note: c.uv?.advice ?? "Sin cuidados especiales" },
    { icon: "clock" as const, title: "Mejor hora para caminar", value: c.bestHour ? (c.bestHour.now ? "Ahora" : c.bestHour.hour) : "—", note: c.bestHour?.why ?? "" },
    {
      icon: (body.mode === "walk" ? "footprints" : "bike") as "footprints" | "bike",
      title: body.recommended ? "Tu movimiento hoy" : `Si vas ${bodyLabel}`,
      value: `${body.activeMin} min ${bodyLabel}`,
      note: [`${body.weeklyPct}% de tu meta semanal`, body.steps ? `≈ ${body.steps.toLocaleString("es-PE")} pasos` : null, `≈ ${body.kcal} kcal`].filter(Boolean).join(" · "),
    },
  ];

  return (
    <section aria-live="polite" aria-labelledby="body-title" className={cx("rounded-card border-2 p-6 shadow-card sm:p-8", t.soft, t.border)}>
      <div className="flex items-center gap-3">
        <IconTile icon="sparkles" tone={s.tone} />
        <div>
          <h2 id="body-title" className={cx("text-xl font-medium", t.text)}>Hoy para tu cuerpo</h2>
          <p className={cx("text-sm", t.text)}>{c.effect}</p>
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((x) => (
          <div key={x.title} className="rounded-tile border border-line bg-surface p-4">
            <p className="flex items-center gap-2 text-sm text-muted"><Icon name={x.icon} className={cx("size-4", t.fg)} />{x.title}</p>
            <p className="mt-1 text-lg font-medium text-ink">{x.value}</p>
            {x.note && <p className="mt-0.5 text-sm text-muted">{x.note}</p>}
          </div>
        ))}
      </div>
      <p className={cx("mt-4 text-xs opacity-80", t.text)}>
        Meta semanal de referencia: 150 minutos de actividad moderada (OMS). YIO no guarda datos de salud.
      </p>
    </section>
  );
}
