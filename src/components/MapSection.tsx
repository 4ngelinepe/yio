import { ArrowRight, MapPin, Navigation, User } from "lucide-react";
import { brand } from "../config/brand";
import type { Recommendation } from "../data/content";
import { Card } from "./ui/primitives";

function Stop({ label, children, className }: { label?: string; children: React.ReactNode; className: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className={`grid size-12 place-items-center rounded-full border-4 border-surface text-white sm:size-16 ${className}`}>
        {children}
      </span>
      {label && (
        <span className="rounded-control bg-surface px-3 py-1 text-sm text-ink shadow-card sm:text-base">
          {label}
        </span>
      )}
    </div>
  );
}

export function MapSection({ route }: { route: Recommendation["route"] }) {
  return (
    <Card id="mapa" className="overflow-hidden scroll-mt-24" labelledBy="map-title">
      <h2 id="map-title" className="px-6 py-6 text-xl font-medium text-ink sm:px-10">
        Mapa del corredor recomendado
      </h2>

      <div className="relative aspect-[4/3] sm:aspect-[16/7]">
        {brand.mapImage ? (
          <img src={brand.mapImage} alt="" className="absolute inset-0 size-full object-cover opacity-60" />
        ) : (
          <div className="image-slot absolute inset-0 grid place-items-start p-4">
            <span className="rounded-control bg-surface px-2 py-1 text-xs text-subtle">
              Imagen / mapa interactivo
            </span>
          </div>
        )}

        {/* Ruta */}
        <div className="absolute inset-x-6 top-[38%] -translate-y-1/2 sm:inset-x-[28%]">
          <div className="relative flex items-start justify-between">
            <span className="absolute inset-x-8 top-6 h-1 bg-primary sm:top-8" aria-hidden />
            <Stop label={route.from} className="bg-success">
              <MapPin className="size-6" />
            </Stop>
            <Stop className="bg-primary">
              <User className="size-5" />
            </Stop>
            <Stop label={route.to} className="bg-danger">
              <Navigation className="size-6" />
            </Stop>
          </div>
        </div>

        {/* Leyenda del recorrido */}
        <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-2 rounded-tile bg-surface/90 px-5 py-4 text-sm text-ink backdrop-blur sm:inset-x-8 sm:text-lg">
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-success" />{route.from}
          </span>
          <span className="flex items-center gap-2">
            <ArrowRight className="size-4 text-muted" />{route.via}
          </span>
          <span className="flex items-center gap-2">
            <ArrowRight className="size-4 text-muted" />
            <span className="size-2.5 rounded-full bg-danger" />{route.to}
          </span>
        </div>
      </div>
    </Card>
  );
}
