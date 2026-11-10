import { useState } from "react";
import { ArrowRight, Trash2 } from "lucide-react";
import { soles } from "../lib/engine";
import { monthSummary, type SavedTrip } from "../lib/savings";
import { Card, StatTile } from "./ui/primitives";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function MySavings({ list, onClear, loggedIn, onLogin, error }: {
  list: SavedTrip[]; onClear: () => void; loggedIn: boolean; onLogin: () => void; error: string | null;
}) {
  const [confirming, setConfirming] = useState(false);
  const m = monthSummary(list);

  return (
    <Card id="mis-ahorros" className="scroll-mt-24 p-6 sm:p-10" labelledBy="savings-title">
      <h2 id="savings-title" className="text-xl text-ink">Mis ahorros</h2>

      {list.length === 0 ? (
        <p className="mt-3 text-muted">
          Todavía no guardas ningún ahorro. Calcula un tramo y toca <strong>Guardar mi ahorro</strong>.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">Este mes</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <StatTile label="Ahorrado" value={soles(m.amount)} icon="dollar" tone="success" />
            <StatTile label="Tramos guardados" value={`${m.trips} (${m.walks} caminando)`} icon="footprints" tone="info" />
            <StatTile label="Energía" value={`${m.kcal.toLocaleString("es-PE")} kcal`} icon="flame" tone="energy" />
          </div>

          <ul className="mt-6 divide-y divide-line rounded-tile border border-line">
            {list.slice(0, 8).map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span className="flex items-center gap-2 text-ink">
                  {t.from} <ArrowRight className="size-3.5 text-muted" /> {t.to}
                  <span className="text-muted">· {t.mode === "walk" ? "caminando" : "en bus"}</span>
                </span>
                <span className="text-muted">{fmtDate(t.date)} · <span className="text-success-text">{soles(t.amount)}</span></span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center gap-3 text-sm">
            {confirming ? (
              <>
                <span className="text-muted">¿Borrar todo el historial?</span>
                <button type="button" className="text-danger-text underline" onClick={() => { onClear(); setConfirming(false); }}>Sí, borrar</button>
                <button type="button" className="text-muted underline" onClick={() => setConfirming(false)}>Cancelar</button>
              </>
            ) : (
              <button type="button" className="inline-flex items-center gap-1.5 text-muted hover:text-ink" onClick={() => setConfirming(true)}>
                <Trash2 className="size-4" /> Borrar historial
              </button>
            )}
          </div>
        </>
      )}
      {error && <p role="alert" className="mt-4 text-sm text-danger-text">{error}</p>}
      {loggedIn ? (
        <p className="mt-4 text-xs text-subtle">Guardado en tu cuenta: lo ves desde cualquier dispositivo.</p>
      ) : (
        <p className="mt-4 text-xs text-subtle">
          Se guarda solo en este dispositivo.{" "}
          <button type="button" onClick={onLogin} className="text-primary underline">Entra con tu correo</button>{" "}
          para no perderlo.
        </p>
      )}
    </Card>
  );
}
