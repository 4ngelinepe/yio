import { PortadaArco } from "./ui/LimaIcons";
import { ArrowRight, Bookmark, BookmarkCheck, Loader2, Map } from "lucide-react";
import type { Recommendation } from "../data/content";
import { Button, Card, StatTile } from "./ui/primitives";

export type SaveState = { kind: "idle" } | { kind: "saving" } | { kind: "saved"; cloud: boolean } | { kind: "error"; msg: string };

const headline = (r: Recommendation) => {
  const rec = r.options.find((o) => o.id === r.recommended)!;
  if (rec.id === "walk") return "camina";
  if (rec.id === "bike") return "ve en bici";
  if (rec.id === "scooter") return "ve en scooter";
  if (rec.title.startsWith("A pie + ")) return `camina y toma el ${rec.title.slice(8)}`;
  return `toma el ${rec.title}`;
};

export function RouteSummary({ data, save, onSave }: {
  data: Recommendation; save: SaveState; onSave: () => void;
}) {
  const { route } = data;
  const saved = save.kind === "saved";

  return (
    <Card className="p-6 sm:p-10">
      <p className="text-sm text-muted">{route.routeLabel} · {route.note}</p>
      <h2 className="mt-1 flex flex-wrap items-center gap-x-2 text-lg text-primary sm:text-xl">
        {route.from} <ArrowRight className="size-4" /> {route.to}
      </h2>
      <p className="mt-4 text-2xl font-medium text-ink">Recomendación: {headline(data)}</p>
      <p className="mt-1 text-muted">{data.why}</p>
      <p className="mt-3 border-l-2 border-primary pl-3 text-sm italic text-ink">{data.quote}</p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {data.today.map((s) => <StatTile key={s.label} {...s} />)}
      </div>

      <details className="mt-3 text-sm text-muted">
        <summary className="cursor-pointer select-none text-primary">¿Cómo calculamos tu ahorro?</summary>
        <ul className="mt-2 space-y-1 pl-4">
          {data.savingsHow.map((t) => <li key={t} className="list-disc">{t}</li>)}
        </ul>
        <p className="mt-2 text-xs">Taxi: tarifa referencial de app en Lima según la distancia. No incluye tarifa dinámica.</p>
      </details>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
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
          disabled={saved || save.kind === "saving"}
          onClick={onSave}
          icon={
            save.kind === "saving" ? <Loader2 className="size-5 animate-spin" />
            : saved ? <BookmarkCheck className="size-5" /> : <Bookmark className="size-5" />
          }
        >
          {save.kind === "saving" ? "Registrando…" : saved ? "Viaje registrado" : "Registrar este viaje"}
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
