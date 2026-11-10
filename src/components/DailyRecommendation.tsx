import { ArrowDown, Loader2 } from "lucide-react";
import { goals, type GoalId } from "../data/content";
import type { Air, Weather } from "../lib/live";
import { cx } from "../lib/tones";
import { Icon } from "./ui/Icon";
import { Button, Card } from "./ui/primitives";

type Props = {
  weather: Weather | null;
  air: Air | null;
  liveLoading: boolean;
  places: string[];
  destinations: string[];
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  goal: GoalId;
  onGoalChange: (g: GoalId) => void;
  onCalculate: () => void;
  loading: boolean;
};

function StopSelect({ id, label, value, options, onChange }: {
  id: string; label: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm text-muted">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-tile border-2 border-line bg-surface-muted px-4 py-3 text-lg text-ink focus:border-primary"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

export function DailyRecommendation(p: Props) {
  return (
    <Card className="p-6 sm:p-10" labelledBy="goal-title">
      {/* Clima y aire en vivo */}
      <div className="flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-tile bg-energy text-white">
          {p.liveLoading ? <Loader2 className="size-7 animate-spin" /> : <Icon name={p.weather?.icon ?? "sun"} className="size-8" />}
        </span>
        <div className="leading-tight">
          <p className="text-muted">Lima, Perú</p>
          <p className="text-xl text-ink">{p.weather ? `${p.weather.temp}°C` : p.liveLoading ? "…" : "Sin datos"}</p>
          <p className="text-sm text-subtle">
            {p.weather?.label ?? "Clima no disponible"}
            {p.air && <> · Aire AQI {p.air.usAqi}</>}
          </p>
        </div>
      </div>

      {/* Tramo */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg text-ink">¿Qué tramo vas a hacer?</h2>
        <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <StopSelect id="from" label="Desde (paradero del Corredor Rojo)" value={p.from} options={p.places} onChange={p.onFrom} />
          <ArrowDown className="mx-auto mb-3 size-5 text-subtle sm:-rotate-90" aria-hidden />
          <StopSelect id="to" label="Hasta" value={p.to} options={p.destinations} onChange={p.onTo} />
        </div>
      </div>

      {/* Objetivo */}
      <fieldset className="mt-8">
        <legend id="goal-title" className="mb-4 text-lg text-ink">¿Qué buscas hoy?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {goals.map((g) => {
            const active = g.id === p.goal;
            return (
              <label
                key={g.id}
                className={cx(
                  "flex cursor-pointer items-center gap-4 rounded-tile border-2 px-5 py-4 transition",
                  active ? "border-primary bg-primary-soft text-primary-text" : "border-line bg-surface-muted text-ink hover:border-subtle",
                )}
              >
                <input
                  type="radio" name="goal" value={g.id} checked={active}
                  onChange={() => p.onGoalChange(g.id)}
                  className="size-5 accent-[var(--primary)]"
                />
                <Icon name={g.icon} className="size-5 text-muted" />
                <span className="text-lg">{g.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <Button
        className="mt-8 w-full sm:w-auto sm:px-10"
        onClick={p.onCalculate}
        disabled={p.loading || !p.to}
        icon={p.loading ? <Loader2 className="size-5 animate-spin" /> : null}
      >
        {p.loading ? "Calculando…" : "Calcular recomendación"}
      </Button>
    </Card>
  );
}
