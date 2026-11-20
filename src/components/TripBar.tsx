import { useEffect, useState } from "react";
import { Footprints, Loader2, Square, X } from "lucide-react";
import type { TrackState, TripResult } from "../lib/tracker";
import { Button } from "./ui/primitives";

const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return (h ? `${h}:${String(m).padStart(2, "0")}` : `${m}`) + `:${String(sec).padStart(2, "0")}`;
};

const GUESS: Record<TripResult["guess"], string> = {
  walk: "Por la velocidad, parece que fuiste a pie.",
  "bike-or-bus": "Por la velocidad, parece que fuiste en bici o en bus.",
  vehicle: "Por la velocidad, parece que fuiste en bus, Metro o auto.",
  unknown: "Fue muy corto para saber cómo fuiste.",
};

/** Barra fija mientras se mide un viaje. */
export function TripBar({ state, error, onStop, onCancel }: {
  state: TrackState; error: string | null; onStop: () => void; onCancel: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const waiting = !state.last;
  return (
    <div role="status" aria-live="polite" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-xl">
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <span className="relative flex size-3 shrink-0" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
          <span className="relative inline-flex size-3 rounded-full bg-success" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">
            Viaje en curso · <span className="tabular-nums">{clock(now - state.startedAt)}</span> · <span className="tabular-nums">{state.km.toFixed(2)} km</span>
          </p>
          <p className="truncate text-xs text-muted">
            {error ?? (waiting ? "Buscando señal de GPS…" : state.paused ? "Hubo una pausa: ¿se bloqueó el celular? Déjalo con YIO abierta." : "Deja YIO abierta y la pantalla encendida.")}
            {state.accuracy != null && <span className={state.accuracy > 80 ? "text-warning-text" : ""}> · GPS ±{state.accuracy} m</span>}
          </p>
        </div>
        <button type="button" onClick={onCancel} aria-label="Cancelar el viaje sin guardar" className="rounded-full p-2 text-subtle hover:bg-surface-muted"><X className="size-5" /></button>
        <Button onClick={onStop} icon={waiting ? <Loader2 className="size-4 animate-spin" /> : <Square className="size-4" />}>Terminar</Button>
      </div>
    </div>
  );
}

/** Lo que se midió, con la opción de registrarlo. */
export function TripDone({ trip, onSave, onSaveEstimate, onDiscard }: { trip: TripResult; onSave: () => void; onSaveEstimate: () => void; onDiscard: () => void }) {
  const failed = trip.km < 0.05;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="trip-done">
      <button type="button" aria-label="Cerrar" onClick={onDiscard} className="absolute inset-0 bg-black/45" />
      <div className="relative w-full max-w-md rounded-t-card bg-surface px-6 pb-7 pt-5 shadow-xl sm:rounded-card">
        <Footprints className="size-7 text-primary" aria-hidden />
        <h3 id="trip-done" className="mt-2 text-xl font-semibold text-ink">Llegaste</h3>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-tile bg-surface-muted p-3"><dt className="text-xs text-muted">Distancia</dt><dd className="text-lg font-semibold tabular-nums text-ink">{trip.km.toFixed(2)} km</dd></div>
          <div className="rounded-tile bg-surface-muted p-3"><dt className="text-xs text-muted">Tiempo</dt><dd className="text-lg font-semibold tabular-nums text-ink">{trip.minutes} min</dd></div>
          <div className="rounded-tile bg-surface-muted p-3"><dt className="text-xs text-muted">Velocidad</dt><dd className="text-lg font-semibold tabular-nums text-ink">{trip.avgKmh || "—"} km/h</dd></div>
        </dl>
        {failed ? (
          <p className="mt-3 text-sm text-muted">No pudimos medir la distancia: el GPS no dio puntos precisos (pasa bajo techo, entre edificios altos o con el celular bloqueado). Puedes registrar el viaje con la distancia estimada.</p>
        ) : (
          <p className="mt-3 text-sm text-muted">{GUESS[trip.guess]} Solo guardamos distancia y tiempo, no el recorrido.</p>
        )}
        {failed
          ? <Button className="mt-5 w-full" onClick={onSaveEstimate}>Registrar con la distancia estimada</Button>
          : <Button className="mt-5 w-full" onClick={onSave}>Registrar este tramo medido</Button>}
        <button type="button" onClick={onDiscard} className="mt-3 w-full text-sm text-muted underline">Descartar</button>
      </div>
    </div>
  );
}
