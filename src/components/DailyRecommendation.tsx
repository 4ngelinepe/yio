import { useState } from "react";
import { ArrowDown, Bike, Loader2, LocateFixed, Scooter } from "lucide-react";
import { goals, type GoalId } from "../data/content";
import type { Network, NetworkId, PlaceGroup } from "../data/networks";
import type { Air, Weather } from "../lib/live";
import { cx } from "../lib/tones";
import { Icon } from "./ui/Icon";
import { Button, Card } from "./ui/primitives";

type Props = {
  clock: string;
  dark: boolean;
  networks: Network[];
  networkId: NetworkId;
  onNetwork: (id: NetworkId) => void;
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
  hasScooter: boolean;
  onHasScooter: (v: boolean) => void;
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
      {/* Hora, clima y aire en vivo, en una línea */}
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
        <span className="font-medium tabular-nums text-ink">{p.clock}</span>
        <span>·</span>
        {p.liveLoading
          ? <Loader2 className="size-4 animate-spin text-energy" />
          : <Icon name={p.weather?.icon ?? "cloud"} className="size-5 text-energy" />}
        <span className="text-ink">Lima</span>
        {p.weather ? (
          <>
            <span>· {p.weather.temp}°C · {p.weather.label}</span>
            {p.air && <span>· Aire AQI {p.air.usAqi}</span>}
          </>
        ) : (
          <span>· {p.liveLoading ? "cargando clima…" : "sin datos de clima ahora"}</span>
        )}
      </p>
      {/* Pronóstico de las próximas horas */}
      {p.weather && p.weather.next.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted" aria-label="Pronóstico de las próximas horas">
          {p.weather.next.map((h) => (
            <span key={h.hour} className="inline-flex items-center gap-1" title={h.label}>
              <span className="tabular-nums">{h.hour}</span>
              <Icon name={h.icon} className="size-4 text-energy" />
              <span className="tabular-nums text-ink">{h.temp}°</span>
              {h.rainProb >= 30 && <span className="text-info-text">{h.rainProb}%</span>}
            </span>
          ))}
          <span className="text-subtle">
            {p.weather.rainSoon ? "· Posible lluvia pronto" : p.dark ? `· Amanece ${p.weather.sunrise}` : `· Atardece ${p.weather.sunset}`}
          </span>
        </div>
      )}

      {/* Tramo */}
      <div className="mt-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg text-ink">¿Qué tramo vas a hacer?</h2>
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
        <div role="radiogroup" aria-label="Corredor" className="mb-4 flex flex-wrap gap-2">
          {p.networks.map((n) => {
            const active = n.id === p.networkId;
            return (
              <button
                key={n.id} type="button" role="radio" aria-checked={active}
                onClick={() => p.onNetwork(n.id)}
                className={cx(
                  "rounded-full border px-4 py-2 text-sm transition",
                  active ? "border-primary bg-primary text-primary-fg" : "border-line text-ink hover:bg-surface-muted",
                )}
              >
                {n.name}
                {n.fare === 0 && <span className={cx("ml-1.5 text-xs", active ? "opacity-80" : "text-success-text")}>· gratis</span>}
              </button>
            );
          })}
          <span className="rounded-full border border-dashed border-line px-4 py-2 text-sm text-subtle">Azul y Morado · pronto</span>
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

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-ink">
        <span className="text-sm text-muted">Para este tramo tengo:</span>
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={p.hasBike} onChange={(e) => p.onHasBike(e.target.checked)} className="size-5 accent-[var(--primary)]" />
          <Bike className="size-5 text-muted" /> Bici
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={p.hasScooter} onChange={(e) => p.onHasScooter(e.target.checked)} className="size-5 accent-[var(--primary)]" />
          <Scooter className="size-5 text-muted" /> Scooter
        </label>
      </div>

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
