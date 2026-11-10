import { useEffect, useRef, useState } from "react";
import { brand, themes, type ThemeName } from "./config/brand";
import { getRecommendation, type GoalId, type Recommendation } from "./data/content";
import { Header } from "./components/Header";
import { DailyRecommendation } from "./components/DailyRecommendation";
import { CorridorStatus } from "./components/CorridorStatus";
import { MapSection } from "./components/MapSection";
import { RouteSummary } from "./components/RouteSummary";
import { DirectComparison } from "./components/DirectComparison";
import { CumulativeImpact } from "./components/CumulativeImpact";
import { InspirationalQuote } from "./components/InspirationalQuote";
import { Footer } from "./components/Footer";
import { HelpButton, ThemeSwitcher } from "./components/Floating";

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
  const [goal, setGoal] = useState<GoalId>("rapido");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Recommendation | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("theme", theme); } catch { /* noop */ }
  }, [theme]);

  const calculate = () => {
    setLoading(true);
    // Simula la llamada al backend
    setTimeout(() => {
      setResult(getRecommendation(goal));
      setLoading(false);
      requestAnimationFrame(() =>
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }, 700);
  };

  return (
    <div className="min-h-screen bg-bg">
      <Header />

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6 sm:py-12">
        <DailyRecommendation
          goal={goal}
          onGoalChange={setGoal}
          onCalculate={calculate}
          loading={loading}
        />

        {result && (
          <div ref={resultsRef} className="scroll-mt-24 space-y-10">
            <CorridorStatus level={result.status} />
            <MapSection route={result.route} />
            <RouteSummary key={goal} data={result} />
            <DirectComparison data={result.compare} />
            <CumulativeImpact data={result.impact} />
            <InspirationalQuote text={result.quote} />
          </div>
        )}
      </main>

      <Footer />
      <HelpButton />
      {brand.showThemeSwitcher && <ThemeSwitcher value={theme} onChange={setTheme} />}
    </div>
  );
}
