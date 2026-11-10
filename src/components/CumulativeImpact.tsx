import { TrendingUp } from "lucide-react";
import type { Recommendation } from "../data/content";
import { StatTile } from "./ui/primitives";

export function CumulativeImpact({ data }: { data: Recommendation["impact"] }) {
  return (
    <section className="rounded-card border border-info-border bg-info-soft p-6 shadow-card sm:p-10">
      <h2 className="text-lg text-info-text">{data.intro}</h2>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {data.stats.map((s) => <StatTile key={s.label} {...s} variant="plain" />)}
      </div>

      <div className="mt-6 rounded-tile border border-info-border bg-surface p-6">
        <p className="flex items-center gap-3 text-lg text-info-text">
          <TrendingUp className="size-6 text-primary" /> Eso equivale a:
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {data.equivalences.map((e) => (
            <li key={e} className="flex items-center gap-3 text-ink">
              <span className="size-2.5 rounded-full bg-primary" /> {e}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
