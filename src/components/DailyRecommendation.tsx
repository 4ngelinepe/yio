import { useState } from "react";
import { ArrowDown, Bike, Loader2, LocateFixed } from "lucide-react";
import { goals, type GoalId } from "../data/content";
import type { PlaceGroup } from "../data/rojo";
import type { Air, Weather } from "../lib/live";
import { cx } from "../lib/tones";
import { Icon } from "./ui/Icon";
import { Button, Card } from "./ui/primitives";

type Props = {
  weather: Weather | null;
  air: Air | null;
  liveLoading: boolean;
  fromGroups: PlaceGroup[];
  toGroups: PlaceGroup[];
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  onLocate: () => Promise<string | null>;
  goal: GoalId;
  onGoalChange: (g: GoalId) => void;
  hasBike: boolean;
  onHasBike: (v: boolean) => void;
  onCalculate: () => void;
  loading: boolean;
};

function StopSelect({ id, label, value, groups, placeholder, disabled, onChange }: {
  id: string; label: string; value: string; groups: PlaceGroup[]; placeholder: string; disabled?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm text-muted">{label}</label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cx(
          "w-full appearance-none rounded-tile border-2 border-line bg-surface-muted px-4 py-3 text-lg focus:border-primary disabled:opacity-50",
          value ? "text-ink" : "text-subtle",
        )}
      >
        <option value="" disabled>{placeholder}</option>
        {groups.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.places.map((p) => <option key={`${g.label}-${p}`} value={p}>{p}</option>)}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

export function DailyRecommendation(p: Props) {
  const [locating, setLocating] = useState(false);
  const [locateMsg, setLocateMsg] = useState<string | null>(null);

  const locate = async () => {
    setLocating(true);
    setLocateMsg(await p.onLocate());
    setLocating(false);
  };

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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg text-ink">¿Qué tramo del Corredor Rojo vas a hacer?</h2>
          <button
            type="button"
            onClick={locate}
            disabled={locating}
            className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-ink hover:bg-surface-muted"
          >
            {locating ? <Loader2 className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}
            Paradero más cercano
          </button>
        </div>
        <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <StopSelect id="from" label="Desde" value={p.from} groups={p.fromGroups} placeholder="Elige tu paradero" onChange={p.onFrom} />
          <ArrowDown className="mx-auto mb-3 size-5 text-subtle sm:-rotate-90" aria-hidden />
          <StopSelect
            id="to" label="Hasta" value={p.to} groups={p.toGroups}
            placeholder={p.from ? "Elige tu destino" : "Primero elige desde dónde"}
            disabled={!p.from} onChange={p.onTo}
          />
        </div>
        {locateMsg && <p className="mt-2 text-sm text-muted">{locateMsg}</p>}
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

      <label className="mt-6 inline-flex cursor-pointer items-center gap-3 text-ink">
        <input
          type="checkbox" checked={p.hasBike} onChange={(e) => p.onHasBike(e.target.checked)}
          className="size-5 accent-[var(--primary)]"
        />
        <Bike className="size-5 text-muted" />
        Tengo bici para este tramo
      </label>

      <div className="mt-8">
        <Button
          className="w-full sm:w-auto sm:px-10"
          onClick={p.onCalculate}
          disabled={p.loading || !p.from || !p.to}
          icon={p.loading ? <Loader2 className="size-5 animate-spin" /> : null}
        >
          {p.loading ? "Calculando…" : "Calcular recomendación"}
        </Button>
      </div>
    </Card>
  );
}
