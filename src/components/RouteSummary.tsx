import { useState } from "react";
import { ArrowRight, Bookmark, BookmarkCheck, Map } from "lucide-react";
import type { Recommendation } from "../data/content";
import { Button, Card, StatTile } from "./ui/primitives";

export function RouteSummary({ data }: { data: Recommendation }) {
  const [saved, setSaved] = useState(false);
  const { route } = data;

  return (
    <Card className="p-6 sm:p-10">
      <h2 className="flex flex-wrap items-center gap-x-2 text-lg text-primary sm:text-xl">
        {route.from} <ArrowRight className="size-4" /> {route.via} <ArrowRight className="size-4" />
        {route.to} <span>({route.note})</span>
      </h2>

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
          onClick={() => setSaved((s) => !s)}
          icon={saved ? <BookmarkCheck className="size-5" /> : <Bookmark className="size-5" />}
        >
          {saved ? "Ahorro guardado" : "Guardar mi ahorro"}
        </Button>
      </div>
    </Card>
  );
}
