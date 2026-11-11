import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ArrowRight, Bike, Loader2 } from "lucide-react";
import type { Recommendation } from "../data/content";
import { BIKE_SOURCE, getBikeData, type BBox } from "../lib/bikes";
import { cx } from "../lib/tones";
import { Card } from "./ui/primitives";

const cssVar = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#333";

type BikeState = "off" | "loading" | "on" | "error";

export function MapSection({ route, path, theme }: {
  route: Recommendation["route"]; path: Recommendation["path"]; theme: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const bikeLayer = useRef<L.LayerGroup | null>(null);
  const [bikes, setBikes] = useState<BikeState>("off");
  const [bikeCount, setBikeCount] = useState({ lanes: 0, parking: 0 });

  // Mapa base + tramo
  useEffect(() => {
    if (!el.current || path.length < 2) return;
    const map = L.map(el.current, { scrollWheelZoom: false });
    mapRef.current = map;
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
    setBikes("off");
    return () => { map.remove(); mapRef.current = null; bikeLayer.current = null; };
  }, [path, theme]);

  const toggleBikes = async () => {
    const map = mapRef.current;
    if (!map) return;
    if (bikes === "on") {
      bikeLayer.current?.remove();
      bikeLayer.current = null;
      setBikes("off");
      return;
    }
    setBikes("loading");
    const lats = path.map((p) => p.lat);
    const lngs = path.map((p) => p.lng);
    const pad = 0.008; // ~900 m alrededor del tramo
    const bbox: BBox = [Math.min(...lngs) - pad, Math.min(...lats) - pad, Math.max(...lngs) + pad, Math.max(...lats) + pad];
    const { lanes, parking } = await getBikeData(bbox);
    if (mapRef.current !== map) return; // el mapa cambió mientras cargaba
    if (lanes.every((l) => !l.data) && !parking) { setBikes("error"); return; }

    const color = cssVar("--highlight");
    const group = L.layerGroup();
    let laneCount = 0;
    lanes.forEach((l) => {
      if (!l.data) return;
      laneCount += l.data.features.length;
      L.geoJSON(l.data, {
        style: { color, weight: 3, opacity: 0.85, dashArray: l.dash },
        onEachFeature: (f, layer) => layer.bindTooltip(`${l.label}${f.properties?.Nombre_de ? ` · ${f.properties.Nombre_de}` : ""}`),
      }).addTo(group);
    });
    if (parking) {
      L.geoJSON(parking, {
        pointToLayer: (_f, latlng) =>
          L.circleMarker(latlng, { radius: 3.5, color, weight: 1.5, fillColor: "#fff", fillOpacity: 1 }).bindTooltip("Cicloparqueadero"),
      }).addTo(group);
    }
    group.addTo(map);
    bikeLayer.current = group;
    setBikeCount({ lanes: laneCount, parking: parking?.features.length ?? 0 });
    setBikes("on");
  };

  return (
    <Card id="mapa" className="overflow-hidden scroll-mt-24" labelledBy="map-title">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 sm:px-10">
        <h2 id="map-title" className="text-xl font-medium text-ink">Mapa del tramo</h2>
        <button
          type="button"
          onClick={toggleBikes}
          disabled={bikes === "loading"}
          aria-pressed={bikes === "on"}
          className={cx(
            "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
            bikes === "on" ? "border-highlight bg-highlight text-white" : "border-line text-ink hover:bg-surface-muted",
          )}
        >
          {bikes === "loading" ? <Loader2 className="size-4 animate-spin" /> : <Bike className="size-4" />}
          {bikes === "on" ? "Ocultar ciclovías" : "Ver ciclovías"}
        </button>
      </div>
      <div ref={el} className="image-slot relative z-0 aspect-[4/3] sm:aspect-[16/7]" />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-6 py-4 text-sm text-ink sm:px-10 sm:text-base">
        <span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-success" />{route.from}</span>
        <span className="flex items-center gap-2 text-muted"><ArrowRight className="size-4" />{route.via}</span>
        <span className="flex items-center gap-2"><ArrowRight className="size-4 text-muted" /><span className="size-2.5 rounded-full bg-danger" />{route.to}</span>
      </div>
      {bikes === "on" && (
        <p className="border-t border-line px-6 py-3 text-xs text-muted sm:px-10">
          {bikeCount.lanes} tramos de ciclovía y {bikeCount.parking} cicloparqueaderos cerca. Línea continua: ciclovía; punteada: cicloacera, ciclocarril o carril compartido. {BIKE_SOURCE}.
        </p>
      )}
      {bikes === "error" && (
        <p role="alert" className="border-t border-line px-6 py-3 text-xs text-danger-text sm:px-10">
          No se pudieron cargar las ciclovías ahora. Intenta de nuevo en un rato.
        </p>
      )}
    </Card>
  );
}
