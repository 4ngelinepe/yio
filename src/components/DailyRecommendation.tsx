import { Loader2 } from "lucide-react";
import { goals, weather, type GoalId } from "../data/content";
import { cx } from "../lib/tones";
import { Icon } from "./ui/Icon";
import { Button, Card } from "./ui/primitives";

type Props = {
  goal: GoalId;
  onGoalChange: (g: GoalId) => void;
  onCalculate: () => void;
  loading: boolean;
};

export function DailyRecommendation({ goal, onGoalChange, onCalculate, loading }: Props) {
  return (
    <Card className="p-6 sm:p-10" labelledBy="goal-title">
      {/* Clima */}
      <div className="flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-tile bg-energy text-white">
          <Icon name="sun" className="size-8" />
        </span>
        <div className="leading-tight">
          <p className="text-muted">{weather.city}</p>
          <p className="text-xl text-ink">{weather.temp}</p>
          <p className="text-sm text-subtle">{weather.condition}</p>
        </div>
      </div>

      {/* Objetivo */}
      <fieldset className="mt-8">
        <legend id="goal-title" className="mb-5 text-lg text-ink">¿Qué buscas hoy?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {goals.map((g) => {
            const active = g.id === goal;
            return (
              <label
                key={g.id}
                className={cx(
                  "flex cursor-pointer items-center gap-4 rounded-tile border-2 px-5 py-4 transition",
                  active
                    ? "border-primary bg-primary-soft text-primary-text"
                    : "border-line bg-surface-muted text-ink hover:border-subtle",
                )}
              >
                <input
                  type="radio"
                  name="goal"
                  value={g.id}
                  checked={active}
                  onChange={() => onGoalChange(g.id)}
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
        onClick={onCalculate}
        disabled={loading}
        icon={loading ? <Loader2 className="size-5 animate-spin" /> : null}
      >
        {loading ? "Calculando…" : "Calcular recomendación"}
      </Button>
    </Card>
  );
}
