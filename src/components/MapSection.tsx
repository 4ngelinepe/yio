import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ArrowRight, Bike, Loader2 } from "lucide-react";
import type { Recommendation } from "../data/content";
import { BIKE_SOURCE, getBikeData, nearPath, type BBox, type BikeCoverage } from "../lib/bikes";
import { coverageText } from "./DirectComparison";
import { cx } from "../lib/tones";
import { Card } from "./ui/primitives";

const cssVar = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#333";

type BikeState = "off" | "loading" | "on" | "error";

export function MapSection({ route, path, theme, autoBikes = false, bikePath, bikeCov, noBus = false }: {
  route: Recommendation["route"]; path: Recommendation["path"]; theme: string; noBus?: boolean;
  bikePath?: [number, number][]; bikeCov?: BikeCoverage | null;
  /** Muestra las ciclovías de entrada (cuando el usuario tiene bici/scooter o se recomienda). */
  autoBikes?: boolean;
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const bikeLayer = useRef<L.LayerGroup | null>(null);
  const [bikes, setBikes] = useState<BikeState>("off");
  // "route": solo las ciclovías por donde pasa tu ruta en bici; "all": todas las de la zona.
  const [scope, setScope] = useState<"route" | "all">("route");
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
    L.polyline(pts, { color: cssVar("--primary"), weight: noBus ? 4 : 5, opacity: 0.9, dashArray: noBus ? "2 8" : undefined, lineCap: "round" })
      .bindTooltip(noBus ? "Tu ruta a pie" : route.routeLabel).addTo(map);
    if (!noBus) path.slice(1, -1).forEach((p) =>
      L.circleMarker([p.lat, p.lng], { radius: 4, color: cssVar("--primary"), fillColor: "#fff", fillOpacity: 1, weight: 2 })
        .bindTooltip(p.name).addTo(map),
    );
    const end = (p: (typeof path)[number], color: string) =>
      L.circleMarker([p.lat, p.lng], { radius: 9, color: "#fff", weight: 3, fillColor: color, fillOpacity: 1 })
        .bindTooltip(p.name, { permanent: true, direction: "top", offset: [0, -8] }).addTo(map);
    end(path[0], cssVar("--success"));
    end(path[path.length - 1], cssVar("--danger"));

    // Ruta real en bici (verde), si van en bici o scooter
    const showBike = autoBikes && bikePath && bikePath.length > 1;
    if (showBike) L.polyline(bikePath!, { color: cssVar("--success"), weight: 4, opacity: 0.95 }).bindTooltip("Ruta en bici").addTo(map);
    map.fitBounds(L.latLngBounds(showBike ? [...pts, ...bikePath!] : pts), { padding: [40, 40] });
    setBikes("off");
    return () => { map.remove(); mapRef.current = null; bikeLayer.current = null; };
  }, [path, theme, bikePath, autoBikes, noBus]);

  const routeMode = autoBikes && !!bikePath && bikePath.length > 1;

  const clearBikes = () => { bikeLayer.current?.remove(); bikeLayer.current = null; };

  const toggleBikes = async () => {
    if (routeMode) {
      // Con ruta en bici: alterna entre "solo mi ruta" y "toda la zona".
      const next = scope === "route" ? "all" : "route";
      setScope(next);
      clearBikes();
      await loadBikes(next);
      return;
    }
    if (bikes === "on") { clearBikes(); setBikes("off"); return; }
    await loadBikes("all");
  };

  const loadBikes = async (mode: "route" | "all" = routeMode ? "route" : "all") => {
    const map = mapRef.current;
    if (!map || bikeLayer.current) return;
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
    const only = mode === "route" && bikePath && bikePath.length > 1 ? bikePath : null;
    lanes.forEach((l) => {
      if (!l.data) return;
      const data = only ? nearPath(l.data, only) : l.data;
      laneCount += data.features.length;
      L.geoJSON(data, {
        style: { color, weight: 3, opacity: 0.85, dashArray: l.dash },
        onEachFeature: (f, layer) => layer.bindTooltip(`${l.label}${f.properties?.Nombre_de ? ` · ${f.properties.Nombre_de}` : ""}`),
      }).addTo(group);
    });
    const park = parking && only ? nearPath(parking, only) : parking;
    if (park) {
      L.geoJSON(park, {
        pointToLayer: (_f, latlng) =>
          L.circleMarker(latlng, { radius: 3.5, color, weight: 1.5, fillColor: "#fff", fillOpacity: 1 }).bindTooltip("Cicloparqueadero"),
      }).addTo(group);
    }
    group.addTo(map);
    bikeLayer.current = group;
    setBikeCount({ lanes: laneCount, parking: park?.features.length ?? 0 });
    setBikes("on");
  };

  // Ciclovías visibles de entrada si van en bici o scooter.
  useEffect(() => {
    setScope("route");
    if (autoBikes && mapRef.current) void loadBikes(routeMode ? "route" : "all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, theme, autoBikes]);

  return (
    <Card id="mapa" className="overflow-hidden scroll-mt-24" labelledBy="map-title">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 sm:px-10">
        <h2 id="map-title" className="text-xl font-medium text-ink">Mapa del tramo</h2>
        <button
          type="button"
          onClick={toggleBikes}
          disabled={bikes === "loading"}
          aria-pressed={routeMode ? scope === "all" : bikes === "on"}
          className={cx(
            "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
            !routeMode && bikes === "on" ? "border-highlight bg-highlight text-white" : "border-line text-ink hover:bg-surface-muted",
          )}
        >
          {bikes === "loading" ? <Loader2 className="size-4 animate-spin" /> : <Bike className="size-4" />}
          {routeMode ? (scope === "route" ? "Ver todas las ciclovías de la zona" : "Solo las de mi ruta") : bikes === "on" ? "Ocultar ciclovías" : "Ver ciclovías"}
        </button>
      </div>
      <div ref={el} className="image-slot relative z-0 aspect-[4/3] sm:aspect-[16/7]" />
      <ul className="flex flex-wrap gap-x-5 gap-y-1 border-t border-line px-6 py-3 text-xs text-muted sm:px-10" aria-label="Leyenda del mapa">
        <li className="flex items-center gap-2"><span className={noBus ? "w-5 border-t-4 border-dotted border-primary" : "h-1 w-5 rounded-full bg-primary"} />{noBus ? "Tu ruta a pie" : `Recorrido del ${route.routeLabel.includes("Metro") ? "Metro" : "bus"}`}</li>
        {routeMode && <li className="flex items-center gap-2"><span className="h-1 w-5 rounded-full bg-success" />Tu ruta en bici</li>}
        {bikes === "on" && <li className="flex items-center gap-2"><span className="h-1 w-5 rounded-full bg-highlight" />{routeMode && scope === "route" ? "Ciclovía en tu ruta" : "Ciclovías de la zona"}</li>}
        {bikes === "on" && bikeCount.parking > 0 && <li className="flex items-center gap-2"><span className="size-2 rounded-full border-2 border-highlight" />Cicloparqueadero</li>}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-6 py-4 text-sm text-ink sm:px-10 sm:text-base">
        <span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-success" />{route.from}</span>
        <span className="flex items-center gap-2 text-muted"><ArrowRight className="size-4" />{route.via}</span>
        <span className="flex items-center gap-2"><ArrowRight className="size-4 text-muted" /><span className="size-2.5 rounded-full bg-danger" />{route.to}</span>
      </div>
      {autoBikes && bikeCov && (
        <p className="border-t border-line bg-success-soft px-6 py-3 text-sm text-success-text sm:px-10">
          <strong className="font-medium">Ruta en bici (verde):</strong> {coverageText(bikeCov)}
          {bikeCov.pct > 0 && bikeCov.segregatedPct < bikeCov.pct && ` · ${bikeCov.segregatedPct}% separada del tráfico`}.
        </p>
      )}
      {bikes === "on" && (
        <p className="border-t border-line px-6 py-3 text-xs text-muted sm:px-10">
          Línea continua: ciclovía; punteada: cicloacera, ciclocarril o carril compartido. Fuente: {BIKE_SOURCE}.
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
