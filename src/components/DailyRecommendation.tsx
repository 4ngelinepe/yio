import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowDown, Bike, Briefcase, History, Home, Loader2, LocateFixed, MapPin, Scooter, Search, X } from "lucide-react";
import { loadSaved, remember, setSlot, slotOf, type SavedPlaces, type SlotId } from "../lib/places";
import { goals, type GoalId } from "../data/content";
import type { Network, NetworkId, Place, PlaceGroup } from "../data/networks";
import { searchPlaces, type Air, type FoundPlace, type Weather } from "../lib/live";
import { cx } from "../lib/tones";
import { aqiLabel, isPeak, PEAK_LABEL } from "../lib/engine";
import { Icon } from "./ui/Icon";
import { Farol, VentanaReja } from "./ui/LimaIcons";
import { USUAL_LABEL, type UsualMode } from "../lib/engine";
import { Button, Card } from "./ui/primitives";

type Props = {
  clock: string;
  dark: boolean;
  networks: Network[];
  networkId: NetworkId | "libre";
  onNetwork: (id: NetworkId | "libre") => void;
  origin: Place | null;
  dest: Place | null;
  onOrigin: (p: Place | null) => void;
  onDest: (p: Place | null) => void;
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
  usual: UsualMode;
  onUsual: (v: UsualMode) => void;
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

/** Número de paso, igual que en "¿Cómo funciona?". */
function Step({ n }: { n: number }) {
  return <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-medium text-primary-text">{n}</span>;
}

/** Lima aproximada: el cálculo de calles solo funciona dentro de esta caja. */
const inLima = (lat: number, lng: number) => lat > -12.6 && lat < -11.6 && lng > -77.3 && lng < -76.6;

function PlaceSearch({ id, label, value, onChange, locate, saved, onSaved }: {
  id: string; label: string; value: Place | null; onChange: (p: Place | null) => void; locate?: boolean;
  saved: SavedPlaces; onSaved: (s: SavedPlaces) => void;
}) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<"search" | "gps" | null>(null);
  const [found, setFound] = useState<FoundPlace[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);
  const seq = useRef(0);

  // Autocompletar: sugerencias mientras escribes (si el puente del buscador responde).
  useEffect(() => {
    const text = q.trim();
    if (text.length < 3) { setFound(null); setEmpty(false); return; }
    const n = ++seq.current;
    const t = setTimeout(async () => {
      const r = await searchPlaces(text, "auto");
      if (n !== seq.current || r === null) return;
      setFound(r);
      setEmpty(false);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const pick = (pl: Place) => {
    seq.current++;
    onChange(pl);
    onSaved(remember(saved, pl));
    setFound(null); setQ(""); setEmpty(false); setMsg(null);
  };

  const search = async (e: FormEvent) => {
    e.preventDefault();
    if (q.trim().length < 3) { setMsg("Escribe al menos 3 letras."); return; }
    const n = ++seq.current;
    setBusy("search"); setMsg(null); setEmpty(false);
    try {
      const r = (await searchPlaces(q.trim(), "search")) ?? [];
      if (n !== seq.current) return;
      setFound(r);
      setEmpty(!r.length);
    } catch { setMsg("No pudimos buscar ahora. Revisa tu conexión."); }
    setBusy(null);
  };

  const gps = () => {
    if (!navigator.geolocation) { setMsg("Tu navegador no permite ubicarte."); return; }
    setBusy("gps"); setMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(null);
        const { latitude: lat, longitude: lng } = pos.coords;
        if (!inLima(lat, lng)) { setMsg("Estás fuera de Lima: YIO por ahora solo calcula tramos en Lima."); return; }
        onChange({ name: "Mi ubicación", lat, lng });
      },
      () => { setBusy(null); setMsg("No pudimos ver tu ubicación. Revisa el permiso del navegador."); },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  };

  if (value) {
    const slot = slotOf(saved, value);
    return (
      <div className="min-w-0">
        <p className="mb-1.5 text-sm text-muted">{label}</p>
        <div className="flex items-center gap-3 rounded-tile border-2 border-primary bg-primary-soft px-4 py-3 text-lg text-primary-text">
          {slot === "casa" ? <Home className="size-5 shrink-0" aria-hidden /> : slot === "trabajo" ? <Briefcase className="size-5 shrink-0" aria-hidden /> : <MapPin className="size-5 shrink-0" aria-hidden />}
          <span className="min-w-0 flex-1 truncate">{slot ? `${slot === "casa" ? "Casa" : "Trabajo"} · ` : ""}{value.name}</span>
          <button type="button" onClick={() => { onChange(null); setFound(null); }} aria-label={`Cambiar ${label.toLowerCase()}`}
            className="rounded-full p-1 hover:bg-surface-muted"><X className="size-4" /></button>
        </div>
        {!slot && value.name !== "Mi ubicación" && (
          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
            Guardar como:
            {(["casa", "trabajo"] as SlotId[]).map((sl) => (
              <button key={sl} type="button" onClick={() => onSaved(setSlot(saved, sl, value))}
                className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-ink hover:bg-surface-muted">
                {sl === "casa" ? <Home className="size-3.5" /> : <Briefcase className="size-3.5" />}
                {sl === "casa" ? "Casa" : "Trabajo"}{saved[sl] ? " (reemplaza)" : ""}
              </button>
            ))}
          </p>
        )}
      </div>
    );
  }

  const chips: { key: string; label: string; icon: React.ReactNode; place: Place }[] = [
    ...(saved.casa ? [{ key: "casa", label: "Casa", icon: <Home className="size-4" />, place: saved.casa }] : []),
    ...(saved.trabajo ? [{ key: "trabajo", label: "Trabajo", icon: <Briefcase className="size-4" />, place: saved.trabajo }] : []),
    ...saved.recent.map((r, k) => ({ key: `r${k}`, label: r.name, icon: <History className="size-4" />, place: r })),
  ];

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-sm text-muted">{label}</label>
      <form onSubmit={search} className="flex gap-2" role="search">
        <input id={id} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Calle, lugar o distrito" autoComplete="off"
          aria-autocomplete="list" aria-controls={`${id}-list`}
          className="min-w-0 flex-1 rounded-tile border-2 border-line bg-surface-muted px-4 py-3 text-lg text-ink placeholder:text-subtle focus:border-primary" />
        <button type="submit" disabled={!!busy} aria-label="Buscar"
          className="rounded-tile border-2 border-line px-3 text-ink hover:bg-surface-muted">
          {busy === "search" ? <Loader2 className="size-5 animate-spin" /> : <Search className="size-5" />}
        </button>
      </form>
      {!q && (locate || chips.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {locate && (
            <button type="button" onClick={gps} disabled={!!busy}
              className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface-muted">
              {busy === "gps" ? <Loader2 className="size-4 animate-spin" /> : <LocateFixed className="size-4" />} Mi ubicación
            </button>
          )}
          {chips.map((c) => (
            <button key={c.key} type="button" onClick={() => pick(c.place)}
              className="inline-flex max-w-[14rem] items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface-muted">
              {c.icon}<span className="truncate">{c.label}</span>
            </button>
          ))}
        </div>
      )}
      {found && found.length > 0 && (
        <ul id={`${id}-list`} className="mt-2 divide-y divide-line overflow-hidden rounded-tile border border-line" aria-label="Resultados">
          {found.map((f, i) => (
            <li key={i}>
              <button type="button" onClick={() => pick({ name: f.name, lat: f.lat, lng: f.lng })}
                className="w-full px-4 py-2.5 text-left hover:bg-surface-muted">
                <span className="block text-ink">{f.name}</span>
                {f.detail && <span className="block text-xs text-muted">{f.detail}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {empty && (
        <div className="mt-3 flex items-center gap-3 rounded-tile border border-dashed border-line px-4 py-3" role="status">
          <VentanaReja className="size-8 shrink-0 text-primary" />
          <p className="text-sm text-muted">
            <span className="block text-ink">No encontramos ese lugar en Lima.</span>
            Prueba con la calle y el número, o con un lugar conocido.
          </p>
        </div>
      )}
      {msg && <p className="mt-2 text-sm text-muted">{msg}</p>}
    </div>
  );
}

export function DailyRecommendation(p: Props) {
  const [saved, setSaved] = useState<SavedPlaces>(loadSaved);
  const libre = p.networkId === "libre";
  const ready = libre ? !!p.origin && !!p.dest : !!p.from && !!p.to;
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
            {p.air && <span title={`Índice de calidad del aire: ${p.air.usAqi}`}>· Aire {aqiLabel(p.air.usAqi)}</span>}
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

      {/* 1 · Cómo vas */}
      <div className="mt-5">
        <h2 className="mb-4 flex items-center gap-3 text-lg text-ink"><Step n={1} />¿Cómo vas?</h2>
        <div role="radiogroup" aria-label="Cómo vas" className="mb-4 flex flex-wrap gap-2">
          <button
            type="button" role="radio" aria-checked={libre}
            onClick={() => p.onNetwork("libre")}
            className={cx(
              "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition",
              libre ? "border-primary bg-primary text-primary-fg" : "border-line text-ink hover:bg-surface-muted",
            )}
          >
            <Icon name="footprints" className="size-4" />Por dirección
            <span className={cx("text-xs", libre ? "opacity-80" : "text-success-text")}>· a pie, en bici o combinado</span>
          </button>
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
                {(n.fare === 0 || (n.electric && n.kind === "bus")) && (
                  <span className={cx("ml-1.5 text-xs", active ? "opacity-80" : "text-success-text")}>
                    · {[n.fare === 0 ? "gratis" : null, n.electric && n.kind === "bus" ? "eléctrico" : null].filter(Boolean).join(" · ")}
                  </span>
                )}
              </button>
            );
          })}
          <span className="rounded-full border border-dashed border-line px-4 py-2 text-sm text-subtle">Azul y Morado · pronto</span>
        </div>
        {!libre && (() => {
          const peak = isPeak(new Date());
          return (
            <p className={cx("-mt-1 mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs", peak ? "bg-warning-soft text-warning-text" : "bg-surface-muted text-muted")}>
              <Icon name="traffic" className="size-4" />
              {peak ? `Hora punta ahora: más tráfico y buses llenos (${PEAK_LABEL})` : `Fuera de hora punta · la hora punta es ${PEAK_LABEL}`}
            </p>
          );
        })()}
        <div className="mb-4 mt-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-3 text-lg text-ink"><Step n={2} />¿Qué tramo vas a hacer?</h2>
          {!libre && (
            <button type="button" onClick={locate} disabled={locating}
              className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-ink hover:bg-surface-muted">
              {locating ? <Loader2 className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}
              Paradero más cercano
            </button>
          )}
        </div>
        {libre ? (
          <div className="grid items-start gap-3 sm:grid-cols-[1fr_auto_1fr]">
            <PlaceSearch id="origin" label="Desde" value={p.origin} onChange={p.onOrigin} locate saved={saved} onSaved={setSaved} />
            <ArrowDown className="mx-auto mt-2 size-5 text-subtle sm:mt-11 sm:-rotate-90" aria-hidden />
            <PlaceSearch id="dest" label="Hasta" value={p.dest} onChange={p.onDest} saved={saved} onSaved={setSaved} />
          </div>
        ) : (
        <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <StopSelect id="from" label="Desde" value={p.from} groups={p.fromGroups} placeholder="Elige tu paradero" onChange={p.onFrom} />
          <ArrowDown className="mx-auto mb-3 size-5 text-subtle sm:-rotate-90" aria-hidden />
          <StopSelect
            id="to" label="Hasta" value={p.to} groups={p.toGroups}
            placeholder={p.from ? "Elige tu destino" : "Primero elige desde dónde"}
            disabled={!p.from} onChange={p.onTo}
          />
        </div>
        )}
        {locateMsg && <p className="mt-2 text-sm text-muted">{locateMsg}</p>}
      </div>

      {/* Objetivo */}
      <fieldset className="mt-8">
        <legend id="goal-title" className="mb-4 flex items-center gap-3 text-lg text-ink"><Step n={3} />¿Qué buscas hoy?</legend>
        <div className="grid gap-3 sm:grid-cols-3">
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

      <div className="mt-4 flex flex-wrap items-center gap-3 text-ink">
        <label htmlFor="usual" className="text-sm text-muted">Normalmente hago este tramo en:</label>
        <select id="usual" value={p.usual} onChange={(e) => p.onUsual(e.target.value as UsualMode)}
          className="rounded-control border border-line bg-surface-muted px-3 py-2 text-ink focus:border-primary">
          {(Object.keys(USUAL_LABEL) as UsualMode[]).map((k) => <option key={k} value={k}>{USUAL_LABEL[k]}</option>)}
        </select>
        <span className="text-xs text-muted">El ahorro se calcula contra esto.</span>
      </div>

      <div className="mt-8">
        <Button
          className="w-full sm:w-auto sm:px-10"
          onClick={p.onCalculate}
          disabled={p.loading || !ready}
          icon={p.loading ? <Farol lit className="size-5 motion-safe:animate-pulse" /> : null}
        >
          {p.loading ? "Calculando…" : "Calcular recomendación"}
        </Button>
      </div>
    </Card>
  );
}
