import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ArrowRight } from "lucide-react";
import type { Recommendation } from "../data/content";
import { Card } from "./ui/primitives";

const cssVar = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#333";

export function MapSection({ route, path, theme }: {
  route: Recommendation["route"]; path: Recommendation["path"]; theme: string;
}) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!el.current || path.length < 2) return;
    const map = L.map(el.current, { scrollWheelZoom: false, attributionControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map);

    const pts = path.map((p) => [p.lat, p.lng] as [number, number]);
    L.polyline(pts, { color: cssVar("--primary"), weight: 5, opacity: 0.9 }).addTo(map);
    path.slice(1, -1).forEach((p) =>
      L.circleMarker([p.lat, p.lng], { radius: 4, color: cssVar("--primary"), fillColor: "#fff", fillOpacity: 1, weight: 2 })
        .bindTooltip(p.name).addTo(map),
    );
    const end = (p: (typeof path)[number], color: string) =>
      L.circleMarker([p.lat, p.lng], { radius: 9, color: "#fff", weight: 3, fillColor: color, fillOpacity: 1 })
        .bindTooltip(p.name, { permanent: true, direction: "top", offset: [0, -8] }).addTo(map);
    end(path[0], cssVar("--success"));
    end(path[path.length - 1], cssVar("--danger"));

    map.fitBounds(L.latLngBounds(pts), { padding: [40, 40] });
    return () => { map.remove(); };
  }, [path, theme]);

  return (
    <Card id="mapa" className="overflow-hidden scroll-mt-24" labelledBy="map-title">
      <h2 id="map-title" className="px-6 py-6 text-xl font-medium text-ink sm:px-10">Mapa del tramo</h2>
      <div ref={el} className="image-slot relative z-0 aspect-[4/3] sm:aspect-[16/7]" />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-6 py-4 text-sm text-ink sm:px-10 sm:text-base">
        <span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-success" />{route.from}</span>
        <span className="flex items-center gap-2 text-muted"><ArrowRight className="size-4" />{route.via}</span>
        <span className="flex items-center gap-2"><ArrowRight className="size-4 text-muted" /><span className="size-2.5 rounded-full bg-danger" />{route.to}</span>
      </div>
    </Card>
  );
}
