import { useState } from "react";
import { X } from "lucide-react";
import { Farol } from "./ui/LimaIcons";
import { Button } from "./ui/primitives";

const STEPS: { title: string; body: string }[] = [
  {
    title: "Dinos a dónde vas",
    body: "Desde tu ubicación (o el lugar que busques) hasta tu destino. Al tocar un campo aparecen Casa, Trabajo y tus recientes; los recientes se borran con su ×.",
  },
  {
    title: "Toca «¿Cómo me conviene ir?»",
    body: "YIO compara caminar, bus, Metro y taxi con el clima, el aire y el tráfico de ahora. Caminar siempre cuenta: es lo que todos hacemos.",
  },
  {
    title: "Ajusta solo si hace falta",
    body: "En «Ajustes del viaje» dices cómo vas normalmente, si es ida y vuelta, qué buscas hoy y si tienes bici o scooter. Se guardan para la próxima.",
  },
  {
    title: "Mira lo que ganas",
    body: "Cuánto te cuesta moverte, cuánta plata ahorras frente a lo de siempre, cuánto te mueves y el CO₂ que no emites. Si te sirve, registra el viaje.",
  },
];

export const INTRO_KEY = "yio.intro";

export function HowItWorks({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const last = i === STEPS.length - 1;
  const close = () => {
    try { localStorage.setItem(INTRO_KEY, "1"); } catch { /* noop */ }
    onClose();
  };
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="how-title" className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onKeyDown={(e) => e.key === "Escape" && close()}>
      <div className="w-full max-w-md rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Farol lit className="size-8 text-energy" />
            <h2 id="how-title" className="text-xl text-ink">¿Cómo funciona YIO?</h2>
          </div>
          <button type="button" onClick={close} aria-label="Cerrar" className="grid size-9 place-items-center rounded-control text-muted hover:bg-surface-muted">
            <X className="size-5" />
          </button>
        </div>

        <ol className="mt-6 space-y-4" aria-live="polite">
          {STEPS.map((s, k) => (
            <li key={s.title} className={k === i ? "flex gap-4" : "flex gap-4 opacity-40"} aria-current={k === i ? "step" : undefined}>
              <span className={k === i
                ? "grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-medium text-primary-fg"
                : "grid size-8 shrink-0 place-items-center rounded-full border border-line text-sm text-muted"}>
                {k + 1}
              </span>
              <div>
                <p className="text-ink">{s.title}</p>
                {k === i && <p className="mt-1 text-sm text-muted">{s.body}</p>}
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex items-center justify-between gap-3">
          <button type="button" onClick={close} className="text-sm text-muted underline-offset-4 hover:underline">
            Saltar
          </button>
          <div className="flex gap-2">
            {i > 0 && <Button variant="secondary" onClick={() => setI(i - 1)}>Atrás</Button>}
            <Button onClick={() => (last ? close() : setI(i + 1))}>{last ? "Empezar" : "Siguiente"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
