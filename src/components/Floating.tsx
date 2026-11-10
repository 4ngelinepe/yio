import { useState } from "react";
import { CircleHelp, Palette } from "lucide-react";
import { themes, type ThemeName } from "../config/brand";
import { cx } from "../lib/tones";

/** Botón de ayuda flotante (abajo a la derecha). */
export function HelpButton() {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {open && (
        <div role="dialog" aria-label="Ayuda" className="w-72 rounded-tile border border-line bg-surface p-4 text-sm text-muted shadow-card">
          <p className="font-medium text-ink">¿Cómo funciona?</p>
          <p className="mt-2">
            Elige tu tramo en el Corredor Rojo y qué buscas hoy. GEO compara caminar,
            el bus y el taxi con el clima y el aire de ahora, y te dice qué conviene.
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Ayuda"
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
