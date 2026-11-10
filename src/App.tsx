import { useEffect, useMemo, useRef, useState } from "react";
import { brand, themes, type ThemeName } from "./config/brand";
import type { GoalId, Recommendation } from "./data/content";
import { destinationsFrom, findTrip, places } from "./data/rojo";
import { recommend } from "./lib/engine";
import { getAir, getNextBusMinutes, getWeather, type Air, type Weather } from "./lib/live";
import { addRemote, clearRemote, loadLocal, loadRemote, storeLocal, type SavedTrip } from "./lib/savings";
import { supabase } from "./lib/supabase";
import { LoginPanel } from "./components/LoginPanel";
import { Header } from "./components/Header";
import { DailyRecommendation } from "./components/DailyRecommendation";
import { CorridorStatus } from "./components/CorridorStatus";
import { MapSection } from "./components/MapSection";
import { RouteSummary } from "./components/RouteSummary";
import { DirectComparison } from "./components/DirectComparison";
import { CumulativeImpact } from "./components/CumulativeImpact";
import { InspirationalQuote } from "./components/InspirationalQuote";
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
  const [from, setFrom] = useState("Arenales");
  const [to, setTo] = useState("Salaverry");
  const [weather, setWeather] = useState<Weather | null>(null);
  const [air, setAir] = useState<Air | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Recommendation | null>(null);
  const [saved, setSaved] = useState<SavedTrip[]>(loadLocal);
  const [email, setEmail] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const destinations = useMemo(() => destinationsFrom(from), [from]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("theme", theme); } catch { /* noop */ }
  }, [theme]);

  useEffect(() => {
    Promise.all([getWeather(LIMA.lat, LIMA.lng), getAir(LIMA.lat, LIMA.lng)]).then(([w, a]) => {
      setWeather(w);
      setAir(a);
      setLiveLoading(false);
    });
  }, []);

  // Sesión: al entrar, sube los ahorros locales y carga los de la cuenta.
  useEffect(() => {
    const onSession = async (userEmail: string | null) => {
      setEmail(userEmail);
      if (!userEmail) { setSaved(loadLocal()); return; }
      try {
        const local = loadLocal();
        if (local.length) { await addRemote(local); storeLocal([]); }
        setSaved(await loadRemote());
        setSyncError(null);
      } catch {
        setSyncError("No se pudieron cargar tus ahorros de la nube. Se muestran los de este dispositivo.");
      }
    };
    supabase.auth.getSession().then(({ data }) => onSession(data.session?.user.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") onSession(session?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (!email) storeLocal(saved); }, [saved, email]);

  const changeFrom = (v: string) => {
    setFrom(v);
    const next = destinationsFrom(v);
    if (!next.includes(to)) setTo(next[0] ?? "");
  };

  const calculate = async () => {
    setLoading(true);
    const trip = findTrip(from, to);
    const nextBusMin = trip ? await getNextBusMinutes(trip.stopIds[0], trip.routeKey.split("|")[0]) : null;
    const r = recommend({ from, to, goal, now: new Date(), weather, air, nextBusMin });
    setResult(r);
    setLoading(false);
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const isSaved = !!result && saved.some((t) => t.date === result.createdAt);

  const save = async () => {
    if (!result || isSaved) return;
    const rec = result.options.find((o) => o.id === result.recommended)!;
    const trip: SavedTrip = {
      id: result.createdAt,
      date: result.createdAt,
      from: result.route.from,
      to: result.route.to,
      mode: result.recommended,
      amount: Math.round(((result.savings[0] + result.savings[1]) / 2) * 100) / 100,
      kcal: rec.kcal,
    };
    if (!email) { setSaved((list) => [trip, ...list]); return; }
    try {
      const [stored] = await addRemote([trip]);
      setSaved((list) => [stored, ...list]);
      setSyncError(null);
    } catch {
      setSyncError("No se pudo guardar en la nube. Intenta de nuevo.");
    }
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

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6 sm:py-12">
        <DailyRecommendation
          weather={weather}
          air={air}
          liveLoading={liveLoading}
          places={places}
          destinations={destinations}
          from={from}
          to={to}
          onFrom={changeFrom}
          onTo={setTo}
          goal={goal}
          onGoalChange={setGoal}
          onCalculate={calculate}
          loading={loading}
        />

        {result && (
          <div ref={resultsRef} className="scroll-mt-24 space-y-10">
            <CorridorStatus status={result.status} />
            <RouteSummary data={result} saved={isSaved} onSave={save} />
            <MapSection route={result.route} path={result.path} theme={theme} />
            <DirectComparison data={result} />
            <CumulativeImpact data={result.impact} />
            <InspirationalQuote text={result.quote} />
          </div>
        )}

        <MySavings list={saved} onClear={clearAll} loggedIn={!!email} onLogin={() => setLoginOpen(true)} error={syncError} />
      </main>

      <Footer />
      <HelpButton />
      {loginOpen && <LoginPanel onClose={() => setLoginOpen(false)} />}
      {brand.showThemeSwitcher && <ThemeSwitcher value={theme} onChange={setTheme} />}
    </div>
  );
}
