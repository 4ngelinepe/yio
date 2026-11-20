import { PortadaArco, Cactus } from "./ui/LimaIcons";
import { ArrowRight, Bookmark, BookmarkCheck, Loader2, Navigation } from "lucide-react";
import type { Recommendation } from "../data/content";
import { minRange, soles, solesRange, USUAL_LABEL } from "../lib/engine";
import { Button, Card, StatTile } from "./ui/primitives";

export type SaveState = { kind: "idle" } | { kind: "saving" } | { kind: "saved"; cloud: boolean } | { kind: "error"; msg: string };

/** La decisión, como una frase que se puede seguir: "Camina y toma el Corredor Rojo". */
const headline = (r: Recommendation) => {
  const rec = r.options.find((o) => o.id === r.recommended)!;
  if (r.tooFar) return "A pie es muy largo";
  if (rec.id === "walk") return "Ve caminando";
  if (rec.id === "bike") return "Ve en bici";
  if (rec.id === "scooter") return "Ve en scooter";
  if (rec.title.startsWith("A pie + ")) return `Camina y toma el ${rec.title.slice(8)}`;
  if (rec.title.startsWith("Bici + ")) return `Pedalea y toma el ${rec.title.slice(7)}`;
  return `Toma el ${rec.title}`;
};

const DAYS = 20;

export function RouteSummary({ data, save, onSave, tracking, onStartTrip }: {
  data: Recommendation; save: SaveState; onSave: () => void; tracking?: boolean; onStartTrip?: () => void;
}) {
  const { route } = data;
  const saved = save.kind === "saved";
  const rec = data.options.find((o) => o.id === data.recommended)!;
  const taxi = data.options.find((o) => o.id === "taxi");
  const legs = data.roundTrip ? 2 : 1;
  const tramo = legs === 2 ? ", ida y vuelta" : "";
  const trip: [number, number] = [rec.cost[0] * legs, rec.cost[1] * legs];
  const month: [number, number] = [trip[0] * DAYS, trip[1] * DAYS];
  const savingsTile = data.today.find((t) => t.label.startsWith("Ahorro"));
  const gains = data.today.filter((t) => t.label.startsWith("Energía") || t.label.startsWith("CO₂"));

  return (
    <Card className="p-6 sm:p-10">
      <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
        {route.from} <ArrowRight className="size-3.5" aria-hidden /> {route.to}
      </p>

      {/* 1. La decisión */}
      <p className="mt-4 text-sm font-medium text-primary">{data.tooFar ? "Ojo" : "Te conviene"}</p>
      <h2 className="mt-1 text-3xl font-semibold leading-tight text-ink">{headline(data)}</h2>
      {!data.tooFar && <p className="mt-1 text-lg text-muted">Llegas en {minRange(rec.minutes)}</p>}
      {data.tooFar ? (
        <p className="mt-3 flex items-start gap-3 text-muted"><Cactus className="size-8 shrink-0 text-energy" /><span>{data.why}</span></p>
      ) : (
        <p className="mt-2 text-sm text-muted">{data.why}</p>
      )}

      {/* 2. Lo que te cuesta moverte */}
      <section className="mt-6 rounded-tile border border-line bg-surface p-5" aria-labelledby="cuesta-title">
        <h3 id="cuesta-title" className="text-sm text-muted">Lo que te cuesta moverte</h3>
        <dl className="mt-3 space-y-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="font-medium text-ink">Este viaje{tramo}</dt>
            <dd className="shrink-0 whitespace-nowrap text-2xl font-semibold tabular-nums text-ink">{trip[1] === 0 ? "S/ 0" : solesRange(trip)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink">Si lo haces {DAYS} días al mes</dt>
            <dd className="shrink-0 whitespace-nowrap font-medium tabular-nums text-ink">{month[1] === 0 ? "S/ 0" : solesRange(month)}</dd>
          </div>
          {savingsTile && data.usual && data.usual !== "walk" && (
            <div className="flex items-baseline justify-between gap-3 border-t border-line pt-2.5">
              <dt className="text-success-text">Ahorras frente a ir en {USUAL_LABEL[data.usual]}</dt>
              <dd className="shrink-0 whitespace-nowrap text-right font-semibold tabular-nums text-success-text">{savingsTile.value}</dd>
            </div>
          )}
        </dl>
        {taxi && data.recommended !== "taxi" && data.usual !== "taxi" && (
          <p className="mt-3 text-xs text-muted">En taxi o app serían {solesRange([taxi.cost[0] * legs, taxi.cost[1] * legs])}{tramo} ({soles(taxi.cost[1] * legs * DAYS)} al mes).</p>
        )}
      </section>

      {/* 3. Lo que ganas */}
      {gains.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {gains.map((s) => <StatTile key={s.label} {...s} />)}
        </div>
      )}

      <details className="mt-3 text-sm text-muted">
        <summary className="cursor-pointer select-none text-primary">¿Cómo lo calculamos?</summary>
        <ul className="mt-2 space-y-1 pl-4">
          {data.savingsHow.map((t) => <li key={t} className="list-disc">{t}</li>)}
        </ul>
        <p className="mt-2 text-xs">Taxi: tarifa referencial de app en Lima según la distancia. No incluye tarifa dinámica. "Al mes" supone {DAYS} días con el mismo viaje.</p>
      </details>

      <div className="mt-6 flex flex-col gap-3">
        {onStartTrip && !saved && (
          <>
            <Button className="w-full" onClick={onStartTrip} disabled={tracking} icon={<Navigation className="size-5" />}>
              {tracking ? "Midiendo tu viaje…" : "Iniciar viaje"}
            </Button>
            {!tracking && <p className="-mt-1 text-center text-xs text-muted">Mide los km reales con el GPS mientras YIO está abierta.</p>}
          </>
        )}
        <Button
          variant="secondary"
          className="w-full"
          aria-pressed={saved}
          disabled={saved || save.kind === "saving"}
          onClick={onSave}
          icon={save.kind === "saving" ? <Loader2 className="size-5 animate-spin" /> : saved ? <BookmarkCheck className="size-5" /> : <Bookmark className="size-5" />}
        >
          {save.kind === "saving" ? "Registrando…" : saved ? "Viaje registrado" : "Registrar sin medir"}
        </Button>
        <p aria-live="polite" className="text-sm">
          {saved && (
            <span className="inline-flex items-center gap-2 text-success-text">
              <PortadaArco className="size-5 shrink-0" />
              Listo, {save.cloud ? "quedó en tu cuenta" : "quedó en este dispositivo"}.{" "}
              <a href="#mis-ahorros" className="underline">Ver mi bitácora</a>
            </span>
          )}
          {save.kind === "error" && <span role="alert" className="text-danger-text">{save.msg}</span>}
        </p>
      </div>
    </Card>
  );
}
