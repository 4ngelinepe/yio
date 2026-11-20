import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowDown, Bike, Briefcase, ChevronDown, History, Home, Loader2, LocateFixed, MapPin, Scooter, Search, SlidersHorizontal, Star, X } from "lucide-react";
import { forget, loadSaved, remember, setSlot, slotOf, type SavedPlaces, type SlotId } from "../lib/places";
import { goals, type GoalId } from "../data/content";
import type { Network, NetworkId, Place, PlaceGroup } from "../data/networks";
import { searchPlaces, type Air, type FoundPlace, type Weather } from "../lib/live";
import { cx } from "../lib/tones";
import { aqiLabel, isPeak, PEAK_LABEL } from "../lib/engine";
import { Icon } from "./ui/Icon";
import { Farol, VentanaReja } from "./ui/LimaIcons";
import { USUAL_LABEL, CAR_LABEL, CAR_KMPG, type UsualMode, type CarInfo, type CarType } from "../lib/engine";
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
  car: CarInfo;
  onCar: (v: CarInfo) => void;
  roundTrip: boolean;
  onRoundTrip: (v: boolean) => void;
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
  const [focused, setFocused] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const seq = useRef(0);
  const box = useRef<HTMLDivElement>(null);

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
    setFound(null); setQ(""); setEmpty(false); setMsg(null); setFocused(false);
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
        onChange({ name: "Mi ubicación", lat, lng }); setFocused(false);
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
          {!slot && value.name !== "Mi ubicación" && (
            <button type="button" onClick={() => setSaveOpen((o) => !o)} aria-expanded={saveOpen} aria-label="Guardar como Casa o Trabajo"
              className="rounded-full p-1 hover:bg-surface-muted"><Star className="size-4" /></button>
          )}
          <button type="button" onClick={() => { onChange(null); setFound(null); setSaveOpen(false); }} aria-label={`Cambiar ${label.toLowerCase()}`}
            className="rounded-full p-1 hover:bg-surface-muted"><X className="size-4" /></button>
        </div>
        {saveOpen && !slot && value.name !== "Mi ubicación" && (
          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
            Guardar como:
            {(["casa", "trabajo"] as SlotId[]).map((sl) => (
              <button key={sl} type="button" onClick={() => { onSaved(setSlot(saved, sl, value)); setSaveOpen(false); }}
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

  const chips: { key: string; label: string; icon: React.ReactNode; place: Place; recent?: boolean }[] = [
    ...(saved.casa ? [{ key: "casa", label: "Casa", icon: <Home className="size-4" />, place: saved.casa }] : []),
    ...(saved.trabajo ? [{ key: "trabajo", label: "Trabajo", icon: <Briefcase className="size-4" />, place: saved.trabajo }] : []),
    ...saved.recent.map((r, k) => ({ key: `r${k}`, label: r.name, icon: <History className="size-4" />, place: r, recent: true })),
  ];
  // Los atajos aparecen solo con el campo activo (y no se cierran al tocarlos).
  const onBlur = () => setTimeout(() => { if (!box.current?.contains(document.activeElement)) setFocused(false); }, 120);

  return (
    <div className="min-w-0" ref={box} onFocus={() => setFocused(true)} onBlur={onBlur}>
      <label htmlFor={id} className="mb-1.5 block text-sm text-muted">{label}</label>
      <form onSubmit={search} className="flex gap-2" role="search">
        <input id={id} value={q} onChange={(e) => setQ(e.target.value)} placeholder={locate ? "Calle, lugar o distrito" : "¿A dónde vas?"} autoComplete="off"
          aria-autocomplete="list" aria-controls={`${id}-list`}
          className="min-w-0 flex-1 rounded-tile border-2 border-line bg-surface-muted px-4 py-3 text-lg text-ink placeholder:text-subtle focus:border-primary" />
        <button type="submit" disabled={!!busy} aria-label="Buscar"
          className="rounded-tile border-2 border-line px-3 text-ink hover:bg-surface-muted">
          {busy === "search" ? <Loader2 className="size-5 animate-spin" /> : <Search className="size-5" />}
        </button>
      </form>
      {!q && (locate || (focused && chips.length > 0)) && (
        <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" aria-label="Atajos">
          {locate && (
            <button type="button" onClick={gps} disabled={!!busy}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-primary bg-primary-soft px-3 py-1.5 text-sm text-primary-text">
              {busy === "gps" ? <Loader2 className="size-4 animate-spin" /> : <LocateFixed className="size-4" />} Mi ubicación
            </button>
          )}
          {focused && chips.map((c) => (
            <span key={c.key} className={cx("inline-flex max-w-[15rem] shrink-0 items-center rounded-full border text-sm",
              c.recent ? "border-line text-ink" : "border-primary/30 bg-primary-soft text-primary-text")}>
              <button type="button" onClick={() => pick(c.place)} className="inline-flex min-w-0 items-center gap-2 py-1.5 pl-3 pr-1">
                {c.icon}<span className="truncate">{c.label}</span>
              </button>
              {c.recent ? (
                <button type="button" onClick={() => onSaved(forget(saved, c.place))} aria-label={`Quitar ${c.label} de recientes`}
                  className="mr-1 rounded-full p-1 text-subtle hover:bg-surface-muted hover:text-ink"><X className="size-3.5" /></button>
              ) : <span className="w-2" />}
            </span>
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
  const [sheet, setSheet] = useState(false);

  const locate = async () => {
    setLocating(true);
    setLocateMsg(await p.onLocate());
    setLocating(false);
  };

  // Escape cierra la hoja de ajustes.
  useEffect(() => {
    if (!sheet) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setSheet(false); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [sheet]);

  const extras = [p.hasBike ? "bici" : null, p.hasScooter ? "scooter" : null].filter(Boolean).join(" y ");
  const netName = libre ? null : p.networks.find((n) => n.id === p.networkId)?.name;
  const summary = [
    `Voy en ${USUAL_LABEL[p.usual]}`,
    p.roundTrip ? "ida y vuelta" : "solo ida",
    goals.find((g) => g.id === p.goal)?.label.toLowerCase(),
    extras ? `con ${extras}` : null,
    netName ? `por ${netName}` : null,
  ].filter(Boolean).join(" · ");

  return (
    <Card className="p-6 sm:p-10" labelledBy="goal-title">
      {/* Hora, clima y aire en vivo, en una línea discreta */}
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
        <span className="font-medium tabular-nums text-ink">{p.clock}</span>
        <span>·</span>
        {p.liveLoading
          ? <Loader2 className="size-4 animate-spin text-energy" />
          : <Icon name={p.weather?.icon ?? "cloud"} className="size-5 text-energy" />}
        {p.weather ? (
          <>
            <span>{p.weather.temp}°C · {p.weather.label}</span>
            {p.weather.rainSoon && <span className="text-info-text">· posible lluvia</span>}
            {p.air && <span title={`Índice de calidad del aire: ${p.air.usAqi}`}>· aire {aqiLabel(p.air.usAqi).toLowerCase()}</span>}
          </>
        ) : (
          <span>{p.liveLoading ? "cargando clima…" : "Lima"}</span>
        )}
      </p>

      <h2 id="goal-title" className="mt-4 text-2xl font-semibold text-ink sm:text-3xl">¿A dónde vas hoy?</h2>

      {/* Desde y hasta */}
      <div className="mt-5">
        {!libre && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary-soft px-3 py-1 text-sm text-primary-text">Por {netName}</span>
            <button type="button" onClick={locate} disabled={locating}
              className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-sm text-ink hover:bg-surface-muted">
              {locating ? <Loader2 className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}
              Paradero más cercano
            </button>
          </div>
        )}
        {libre ? (
          <div className="grid items-start gap-3 sm:grid-cols-[1fr_auto_1fr]">
            <PlaceSearch id="origin" label="Desde" value={p.origin} onChange={p.onOrigin} locate saved={saved} onSaved={setSaved} />
            <ArrowDown className="mx-auto size-5 text-subtle sm:mt-11 sm:-rotate-90" aria-hidden />
            <PlaceSearch id="dest" label="Hasta" value={p.dest} onChange={p.onDest} saved={saved} onSaved={setSaved} />
          </div>
        ) : (
          <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
            <StopSelect id="from" label="Desde" value={p.from} groups={p.fromGroups} placeholder="Elige tu paradero" onChange={p.onFrom} />
            <ArrowDown className="mx-auto mb-3 size-5 text-subtle sm:-rotate-90" aria-hidden />
            <StopSelect id="to" label="Hasta" value={p.to} groups={p.toGroups}
              placeholder={p.from ? "Elige tu destino" : "Primero elige desde dónde"} disabled={!p.from} onChange={p.onTo} />
          </div>
        )}
        {locateMsg && <p className="mt-2 text-sm text-muted">{locateMsg}</p>}
      </div>

      <Button className="mt-6 w-full" onClick={p.onCalculate} disabled={p.loading || !ready}
        icon={p.loading ? <Farol lit className="size-5 motion-safe:animate-pulse" /> : null}>
        {p.loading ? "Calculando…" : "¿Cómo me conviene ir?"}
      </Button>

      {/* Ajustes del viaje: plegados, con lo último que elegiste */}
      <button type="button" onClick={() => setSheet(true)} aria-haspopup="dialog"
        className="mt-4 flex w-full items-center gap-3 rounded-control border border-line bg-surface px-4 py-3 text-left hover:bg-surface-muted">
        <SlidersHorizontal className="size-5 shrink-0 text-muted" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-ink">Ajustes del viaje</span>
          <span className="block truncate text-xs text-muted">{summary}</span>
        </span>
        <ChevronDown className="size-5 shrink-0 text-subtle" aria-hidden />
      </button>

      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="ajustes-title">
          <button type="button" aria-label="Cerrar ajustes" onClick={() => setSheet(false)} className="absolute inset-0 bg-black/45" />
          <div className="relative max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-card bg-surface px-6 pb-7 pt-3 shadow-xl sm:rounded-card">
            <span aria-hidden className="mx-auto mb-3 block h-1 w-10 rounded-full bg-line sm:hidden" />
            <h3 id="ajustes-title" className="text-lg font-semibold text-ink">Ajustes del viaje</h3>
            <p className="text-xs text-muted">Se guardan para la próxima vez.</p>

            <div className="divide-y divide-line">
              <label className="flex items-center gap-3 py-3.5 text-ink">
                <span className="flex-1">Normalmente voy en</span>
                <select value={p.usual} onChange={(e) => p.onUsual(e.target.value as UsualMode)}
                  className="rounded-control border border-line bg-surface-muted px-3 py-2 font-medium text-primary focus:border-primary">
                  {(Object.keys(USUAL_LABEL) as UsualMode[]).map((k) => <option key={k} value={k}>{USUAL_LABEL[k][0].toUpperCase() + USUAL_LABEL[k].slice(1)}</option>)}
                </select>
              </label>
              {p.usual === "auto" && (
                <div className="flex flex-wrap items-center gap-3 py-3.5 text-ink">
                  <label htmlFor="cartype" className="text-sm text-muted">Mi auto</label>
                  <select id="cartype" value={p.car.type} onChange={(e) => p.onCar({ ...p.car, type: e.target.value as CarType })}
                    className="rounded-control border border-line bg-surface-muted px-3 py-2 text-ink focus:border-primary">
                    {(Object.keys(CAR_LABEL) as CarType[]).map((k) => <option key={k} value={k}>{CAR_LABEL[k]} · ~{CAR_KMPG[k]} km/gal</option>)}
                  </select>
                  <label htmlFor="parking" className="text-sm text-muted">Parqueo</label>
                  <select id="parking" value={p.car.parking} onChange={(e) => p.onCar({ ...p.car, parking: Number(e.target.value) })}
                    className="rounded-control border border-line bg-surface-muted px-3 py-2 text-ink focus:border-primary">
                    <option value={0}>No pago</option><option value={5}>S/ 5</option><option value={10}>S/ 10</option><option value={15}>S/ 15 o más</option>
                  </select>
                </div>
              )}
              <label className="flex cursor-pointer items-center gap-3 py-3.5 text-ink">
                <span className="flex-1">Ida y vuelta</span>
                <input type="checkbox" checked={p.roundTrip} onChange={(e) => p.onRoundTrip(e.target.checked)} className="size-5 accent-[var(--primary)]" />
              </label>
              <div className="py-3.5">
                <p className="text-ink">Además de caminar, tengo</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {([["bici", p.hasBike, p.onHasBike, <Bike key="b" className="size-4" />], ["scooter", p.hasScooter, p.onHasScooter, <Scooter key="s" className="size-4" />]] as const).map(([name, on, set, ic]) => (
                    <button key={name} type="button" aria-pressed={on} onClick={() => set(!on)}
                      className={cx("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
                        on ? "border-primary bg-primary text-primary-fg" : "border-line text-ink hover:bg-surface-muted")}>
                      {ic}{name[0].toUpperCase() + name.slice(1)}
                    </button>
                  ))}
                  {!p.hasBike && !p.hasScooter && <span className="self-center text-xs text-muted">Nada más: caminas y usas transporte público.</span>}
                </div>
              </div>
              <fieldset className="py-3.5">
                <legend className="text-ink">Hoy quiero</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {goals.map((g) => {
                    const active = g.id === p.goal;
                    return (
                      <label key={g.id} className={cx("inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
                        active ? "border-primary bg-primary text-primary-fg" : "border-line text-ink hover:bg-surface-muted")}>
                        <input type="radio" name="goal" value={g.id} checked={active} onChange={() => p.onGoalChange(g.id)} className="sr-only" />
                        <Icon name={g.icon} className="size-4" />{g.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              <div className="py-3.5">
                <p className="text-ink">Buscar por</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[{ id: "libre" as const, name: "Dirección" }, ...p.networks.map((n) => ({ id: n.id, name: n.name }))].map((n) => {
                    const active = n.id === p.networkId;
                    return (
                      <button key={n.id} type="button" aria-pressed={active} onClick={() => p.onNetwork(n.id)}
                        className={cx("rounded-full border px-3 py-1.5 text-sm",
                          active ? "border-primary bg-primary text-primary-fg" : "border-line text-ink hover:bg-surface-muted")}>
                        {n.name}
                      </button>
                    );
                  })}
                </div>
                {!libre && (() => {
                  const peak = isPeak(new Date());
                  return <p className="mt-2 text-xs text-muted">{peak ? `Hora punta ahora (${PEAK_LABEL}): buses llenos.` : `La hora punta es ${PEAK_LABEL}.`}</p>;
                })()}
              </div>
            </div>
            <Button className="mt-4 w-full" onClick={() => setSheet(false)}>Listo</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
