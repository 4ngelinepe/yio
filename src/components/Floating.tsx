import { CircleHelp, Palette } from "lucide-react";
import { themes, type ThemeName } from "../config/brand";
import { cx } from "../lib/tones";

/** Botón de ayuda flotante (abajo a la derecha): abre "¿Cómo funciona?". */
export function HelpButton({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="fixed bottom-5 right-5 z-40">
      <button
        type="button"
        onClick={onOpen}
        aria-label="¿Cómo funciona?"
        title="¿Cómo funciona?"
        className="grid size-12 place-items-center rounded-full border border-line bg-surface text-ink shadow-card"
      >
        <CircleHelp className="size-6" />
      </button>
    </div>
  );
}

/** Selector de marca para previsualizar (solo desarrollo / presentación). */
export function ThemeSwitcher({ value, onChange }: { value: ThemeName; onChange: (t: ThemeName) => void }) {
  return (
    <div className="fixed bottom-5 left-5 z-40 flex items-center gap-1 rounded-full border border-line bg-surface p-1 text-sm shadow-card">
      <Palette className="mx-2 size-4 text-muted" aria-hidden />
      {themes.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          aria-pressed={t === value}
          className={cx(
            "rounded-full px-3 py-1.5 capitalize",
            t === value ? "bg-primary text-primary-fg" : "text-muted hover:text-ink",
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
