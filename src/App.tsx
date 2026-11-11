import { useEffect, useMemo, useRef, useState } from "react";
import { brand, themes, type ThemeName } from "./config/brand";
import type { GoalId, Recommendation } from "./data/content";
import { NETWORKS, destinationGroups, findTrip, nearestPlace, networkById, placeGroups, type NetworkId } from "./data/networks";
import { recommend } from "./lib/engine";
import { getAir, getBusEta, getStreetTimes, getWeather, type Air, type Weather } from "./lib/live";
import { addRemote, clearRemote, deleteRemote, loadLocal, loadPending, loadRemote, storeLocal, storePending, type SavedTrip } from "./lib/savings";
import { supabase } from "./lib/supabase";
import { LoginPanel } from "./components/LoginPanel";
import { Header } from "./components/Header";
import { DailyRecommendation } from "./components/DailyRecommendation";
import { CorridorStatus } from "./components/CorridorStatus";
import { MapSection } from "./components/MapSection";
import { RouteSummary, type SaveState } from "./components/RouteSummary";
import { DirectComparison } from "./components/DirectComparison";
import { CumulativeImpact } from "./components/CumulativeImpact";
import { MySavings } from "./components/MySavings";
import { Footer } from "./components/Footer";
import { HelpButton, ThemeSwitcher } from "./components/Floating";

const LIMA = { lat: -12.0905, lng: -77.0336 }; // San Isidro, centro del corredor

function initialTheme(): ThemeName {
  const fromUrl = new URLSearchParams(location.search).get("theme");
  if (fromUrl && (themes as readonly string[]).includes(fromUrl)) return fromUrl as ThemeName;
  try {
    const saved = localStorage.getItem("theme");
    if (saved && (themes as readonly string[]).includes(saved)) return saved as ThemeName;
  } catch { /* storage no disponible */ }
  return brand.defaultTheme;
}

export default function App() {
  const [theme, setTheme] = useState<ThemeName>(initialTheme);
  const [goal, setGoal] = useState<GoalId>("ahorro");
  const [networkId, setNetworkId] = useState<NetworkId>(() => {
    try { return (localStorage.getItem("yio.network") as NetworkId) || "rojo"; } catch { return "rojo"; }
  });
  const net = networkById(networkId) ?? networkById("rojo");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [hasBike, setHasBike] = useState<boolean>(() => { try { return localStorage.getItem("yio.hasBike") === "1"; } catch { return false; } });
  const [hasScooter, setHasScooter] = useState<boolean>(() => { try { return localStorage.getItem("yio.hasScooter") === "1"; } catch { return false; } });
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
  const [weather, setWeather] = useState<Weather | null>(null);
  const [air, setAir] = useState<Air | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Recommendation | null>(null);
  const [saved, setSaved] = useState<SavedTrip[]>(loadLocal);
  const [email, setEmail] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [tappId, setTappId] = useState("");
  const [online, setOnline] = useState(() => navigator.onLine);
  const [pending, setPending] = useState<SavedTrip[]>(loadPending);
  const resultsRef = useRef<HTMLDivElement>(null);

  const fromGroups = useMemo(() => placeGroups(net), [net]);
  const toGroups = useMemo(() => (from ? destinationGroups(net, from) : []), [net, from]);

  useEffect(() => { try { localStorage.setItem("yio.network", networkId); } catch { /* noop */ } }, [networkId]);

  const changeNetwork = (id: NetworkId) => {
    if (id === networkId) return;
    setNetworkId(id);
    setFrom("");
    setTo("");
    setResult(null);
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("theme", theme); } catch { /* noop */ }
  }, [theme]);

  // Reloj (hora de Lima) que se actualiza cada 30 s.
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const limaHM = clock.toLocaleTimeString("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hour12: false });

  // Claro de día, oscuro de noche, según el amanecer y el atardecer de Lima.
  const dark = limaHM < (weather?.sunrise ?? "05:45") || limaHM >= (weather?.sunset ?? "18:15");
  useEffect(() => {
    document.documentElement.dataset.mode = dark ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0b1220" : "#2563eb");
  }, [dark]);

  useEffect(() => {
    Promise.all([getWeather(LIMA.lat, LIMA.lng), getAir(LIMA.lat, LIMA.lng)]).then(([w, a]) => {
      setWeather(w);
      setAir(a);
      setLiveLoading(false);
    });
  }, []);

  // Sesión: al entrar, sube los ahorros locales y carga los de la cuenta.
  useEffect(() => {
    const onSession = async (userEmail: string | null, meta?: Record<string, unknown>) => {
      setEmail(userEmail);
      setTappId(typeof meta?.tapp_id === "string" ? meta.tapp_id : "");
      if (!userEmail) { setSaved(loadLocal()); return; }
      try {
        const local = loadLocal();
        if (local.length) { await addRemote(local); storeLocal([]); }
        await flushPending();
        setSaved(await loadRemote());
        setSyncError(null);
      } catch {
        setSyncError("No se pudieron cargar tus ahorros de la nube. Se muestran los de este dispositivo.");
      }
    };
    supabase.auth.getSession().then(({ data }) => onSession(data.session?.user.email ?? null, data.session?.user.user_metadata));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") onSession(session?.user.email ?? null, session?.user.user_metadata);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Conexión: avisar y subir lo pendiente al volver.
  useEffect(() => {
    const up = () => { setOnline(true); if (email) flushPending().then(refreshRemote); };
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  useEffect(() => { storePending(pending); }, [pending]);

  useEffect(() => { if (!email) storeLocal(saved); }, [saved, email]);

  useEffect(() => {
    try {
      localStorage.setItem("yio.hasBike", hasBike ? "1" : "0");
      localStorage.setItem("yio.hasScooter", hasScooter ? "1" : "0");
    } catch { /* noop */ }
  }, [hasBike, hasScooter]);

  const changeFrom = (v: string, netId: NetworkId = networkId) => {
    setFrom(v);
    const next = destinationGroups(networkById(netId), v).flatMap((g) => g.places);
    if (!next.includes(to)) setTo("");
  };

  const locate = () =>
    new Promise<string | null>((resolve) => {
      if (!navigator.geolocation) return resolve("Tu navegador no permite ubicarte.");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          // Busca en todos los corredores y se queda con el paradero más cercano.
          const best = NETWORKS
            .map((n) => ({ n, ...nearestPlace(n, pos.coords.latitude, pos.coords.longitude) }))
            .sort((a, b) => a.meters - b.meters)[0];
          if (!best || best.meters > 3000) return resolve("No hay paraderos ni estaciones de YIO cerca de ti (a más de 3 km).");
          if (best.n.id !== networkId) { setNetworkId(best.n.id); setResult(null); }
          changeFrom(best.place, best.n.id);
          resolve(`Paradero más cercano: ${best.place} (${best.n.name}), a unos ${Math.round(best.meters / 10) * 10} m.`);
        },
        () => resolve("No pudimos ver tu ubicación. Revisa el permiso del navegador."),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
      );
    });

  const calculate = async () => {
    setLoading(true);
    const trip = findTrip(net, from, to);
    const [busEta, streets] = trip
      ? await Promise.all([
          getBusEta(net, trip),
          getStreetTimes(net.stops[trip.stopIds[0]], net.stops[trip.stopIds[trip.stopIds.length - 1]]),
        ])
      : [null, null];
    const r = recommend({ network: net, from, to, goal, now: new Date(), weather, air, busEta, streets, hasBike, hasScooter });
    setResult(r);
    setSaveState({ kind: "idle" });
    setLoading(false);
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  async function flushPending() {
    const queue = loadPending();
    if (!queue.length || !navigator.onLine) return;
    try {
      await addRemote(queue.map(({ pending: _p, ...t }) => t));
      setPending([]);
    } catch { /* se reintenta en la próxima conexión */ }
  }

  async function refreshRemote() {
    try { setSaved(await loadRemote()); } catch { /* noop */ }
  }

  const save = async () => {
    if (!result || saveState.kind === "saving" || saveState.kind === "saved") return;
    const rec = result.options.find((o) => o.id === result.recommended)!;
    const trip: SavedTrip = {
      id: result.createdAt,
      date: result.createdAt,
      from: result.route.from,
      to: result.route.to,
      mode: result.recommended,
      route: result.options.find((o) => o.id === "bus")?.title,
      amount: Math.round(((result.savings[0] + result.savings[1]) / 2) * 100) / 100,
      kcal: rec.kcal,
    };
    if (!email) {
      setSaved((list) => [trip, ...list]);
      setSaveState({ kind: "saved", cloud: false });
      return;
    }
    if (!navigator.onLine) {
      setPending((q) => [{ ...trip, pending: true }, ...q]);
      setSaveState({ kind: "saved", cloud: false });
      return;
    }
    setSaveState({ kind: "saving" });
    try {
      const [stored] = await addRemote([trip]);
      setSaved((list) => [stored, ...list]);
      setSyncError(null);
      setSaveState({ kind: "saved", cloud: true });
    } catch (e) {
      console.error("No se pudo guardar el ahorro", e);
      setSaveState({ kind: "error", msg: "No se pudo guardar en tu cuenta. Revisa tu conexión e intenta de nuevo." });
    }
  };

  const deleteOne = async (id: string) => {
    if (email) {
      try { await deleteRemote(id); } catch { setSyncError("No se pudo borrar ese tramo."); return; }
    }
    setSaved((list) => list.filter((t) => t.id !== id));
  };

  const saveTappId = async (v: string) => {
    const { error } = await supabase.auth.updateUser({ data: { tapp_id: v || null } });
    if (error) return false;
    setTappId(v);
    return true;
  };

  const clearAll = async () => {
    if (email) {
      try { await clearRemote(); } catch { setSyncError("No se pudo borrar el historial."); return; }
    }
    setSaved([]);
  };

  return (
    <div className="min-h-screen bg-bg">
      <Header email={email} onLogin={() => setLoginOpen(true)} onLogout={() => supabase.auth.signOut()} />

      {!online && (
        <p role="status" className="bg-warning-soft px-4 py-2 text-center text-sm text-warning-text">
          Sin conexión: YIO usa tiempos estimados y guarda tus ahorros para subirlos cuando vuelva la señal.
        </p>
      )}
      <main className="mx-auto max-w-6xl space-y-8 px-4 pb-10 pt-4 sm:px-6 sm:pt-6">
        <DailyRecommendation
          clock={limaHM}
          dark={dark}
          weather={weather}
          air={air}
          liveLoading={liveLoading}
          networks={NETWORKS}
          networkId={networkId}
          onNetwork={changeNetwork}
          fromGroups={fromGroups}
          toGroups={toGroups}
          onLocate={locate}
          hasBike={hasBike}
          onHasBike={setHasBike}
          hasScooter={hasScooter}
          onHasScooter={setHasScooter}
          from={from}
          to={to}
          onFrom={(v) => changeFrom(v)}
          onTo={setTo}
          goal={goal}
          onGoalChange={setGoal}
          onCalculate={calculate}
          loading={loading}
        />

        {result && (
          <div ref={resultsRef} className="scroll-mt-24 space-y-10">
            <CorridorStatus status={result.status} />
            <RouteSummary data={result} save={saveState} onSave={save} />
            <MapSection route={result.route} path={result.path} theme={theme} />
            <DirectComparison data={result} />
            <CumulativeImpact data={result.impact} />
          </div>
        )}

        <MySavings
          list={[...pending, ...saved]}
          onClear={clearAll}
          onDelete={deleteOne}
          loggedIn={!!email}
          onLogin={() => setLoginOpen(true)}
          error={syncError}
          tappId={tappId}
          onSaveTappId={saveTappId}
        />
      </main>

      <Footer />
      <HelpButton />
      {loginOpen && <LoginPanel onClose={() => setLoginOpen(false)} />}
      {brand.showThemeSwitcher && <ThemeSwitcher value={theme} onChange={setTheme} />}
    </div>
  );
}
