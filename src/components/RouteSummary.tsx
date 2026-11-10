import { ArrowRight, Bookmark, BookmarkCheck, Map } from "lucide-react";
import type { Recommendation } from "../data/content";
import { Button, Card, StatTile } from "./ui/primitives";

export function RouteSummary({ data, saved, onSave }: {
  data: Recommendation; saved: boolean; onSave: () => void;
}) {
  const { route } = data;
  const rec = data.options.find((o) => o.id === data.recommended)!;

  return (
    <Card className="p-6 sm:p-10">
      <p className="text-sm text-muted">{route.routeLabel} · {route.note}</p>
      <h2 className="mt-1 flex flex-wrap items-center gap-x-2 text-lg text-primary sm:text-xl">
        {route.from} <ArrowRight className="size-4" /> {route.to}
      </h2>
      <p className="mt-4 text-2xl font-medium text-ink">
        Recomendación: {rec.id === "walk" ? "camina" : `toma el ${rec.title}`}
      </p>
      <p className="mt-1 text-muted">{data.why}</p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {data.today.map((s) => <StatTile key={s.label} {...s} />)}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button
          variant="secondary"
          icon={<Map className="size-5" />}
          onClick={() => document.getElementById("mapa")?.scrollIntoView({ behavior: "smooth" })}
        >
          Ver ruta en mapa
        </Button>
        <Button
          variant="success"
          aria-pressed={saved}
          disabled={saved || data.savings[1] === 0}
          onClick={onSave}
          icon={saved ? <BookmarkCheck className="size-5" /> : <Bookmark className="size-5" />}
        >
          {saved ? "Ahorro guardado" : "Guardar mi ahorro"}
        </Button>
      </div>
    </Card>
  );
}
