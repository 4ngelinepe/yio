import { Huaca } from "./ui/LimaIcons";
import { useState } from "react";
import { ArrowLeftRight, ArrowRight, CloudOff, Loader2, Trash2, Wallet, X } from "lucide-react";
import { soles } from "../lib/engine";
import { BIKE_TRIPS_PER_DAY_OFF, modeLabel, monthSummary, type SavedTrip } from "../lib/savings";
import { Button, Card, StatTile } from "./ui/primitives";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const CEDFX_URL = "https://cedfx.com/?utm_source=yio&utm_medium=app&utm_campaign=mis-ahorros";

type Props = {
  list: SavedTrip[];
  onClear: () => void;
  onDelete: (id: string) => void;
  loggedIn: boolean;
  onLogin: () => void;
  error: string | null;
  tappId: string;
  onSaveTappId: (v: string) => Promise<boolean>;
};

/** Paso previo a TAPP: el usuario deja su alias para cuando la transferencia esté disponible. */
const SHOW_WALLET = false;

function WalletPanel({ loggedIn, onLogin, tappId, onSaveTappId }: Pick<Props, "loggedIn" | "onLogin" | "tappId" | "onSaveTappId">) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(tappId);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("saving");
    setState((await onSaveTappId(value.trim())) ? "saved" : "error");
  };

  return (
    <div className="mt-6 rounded-tile border border-line p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" icon={<Wallet className="size-5" />} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          Transferir a mi billetera
        </Button>
        <a href={CEDFX_URL} target="_blank" rel="noopener" className="inline-flex items-center gap-2 text-sm text-primary underline">
          <ArrowLeftRight className="size-4" /> ¿Ahorras en dólares? Cambia online
        </a>
      </div>

      {!open && (
        <button type="button" onClick={() => setOpen(true)} className="mt-3 text-xs text-subtle underline">
          {tappId ? `Tu Tapp ID: ${tappId}` : "Ingresa tu Tapp ID"}
        </button>
      )}

      {open && (
        <div className="mt-4 space-y-3 text-sm text-muted">
          <div className="flex items-start justify-between gap-3">
            <p>
              Muy pronto podrás mover lo que ahorras a tu billetera con <strong className="text-ink">TAPP</strong>, el
              sistema de pagos del BCRP (piloto desde diciembre de 2026). Deja tu Tapp ID y te avisamos cuando esté listo.
            </p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="text-subtle hover:text-ink"><X className="size-4" /></button>
          </div>
          {loggedIn ? (
            <form onSubmit={save} className="flex flex-col gap-2 sm:flex-row">
              <label htmlFor="tapp-id" className="sr-only">Tapp ID</label>
              <input
                id="tapp-id" value={value} onChange={(e) => { setValue(e.target.value); setState("idle"); }}
                placeholder="Tu Tapp ID o celular" maxLength={40} autoComplete="off"
                className="flex-1 rounded-tile border-2 border-line bg-surface-muted px-4 py-2.5 text-ink focus:border-primary"
              />
              <Button type="submit" disabled={state === "saving" || value.trim() === tappId}
                icon={state === "saving" ? <Loader2 className="size-4 animate-spin" /> : null}>
                Guardar
              </Button>
            </form>
          ) : (
            <p><button type="button" onClick={onLogin} className="text-primary underline">Entra con tu correo</button> para dejar tu Tapp ID.</p>
          )}
          {state === "saved" && <p className="text-success-text">Guardado. Te avisamos cuando puedas transferir.</p>}
          {state === "error" && <p role="alert" className="text-danger-text">No se pudo guardar. Intenta de nuevo.</p>}
          <p className="text-xs text-subtle">Solo lo usaremos para la transferencia. Puedes borrarlo dejando el campo vacío.</p>
        </div>
      )}
    </div>
  );
}

export function MySavings(p: Props) {
  const [confirming, setConfirming] = useState(false);
  const m = monthSummary(p.list);

  return (
    <Card id="mis-ahorros" className="scroll-mt-24 p-6 sm:p-10" labelledBy="savings-title">
      <h2 id="savings-title" className="text-xl text-ink">Mi bitácora</h2>

      {p.list.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-tile border border-dashed border-line px-6 py-10 text-center">
          <Huaca className="size-12 text-primary" />
          <p className="max-w-sm text-muted">
            Todavía no registras viajes. Calcula un tramo y toca <strong>Registrar este viaje</strong>: aquí verás tus kilómetros, lo que ahorras y tus viajes en bici.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">Este mes</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatTile label="Viajes" value={`${m.trips}${m.km ? ` · ${m.km.toLocaleString("es-PE")} km` : ""}`} icon="footprints" tone="info" />
            <StatTile label="Ahorrado" value={soles(m.amount)} icon="dollar" tone="success" />
            <StatTile label="CO₂ que no emitiste" value={`${m.co2.toLocaleString("es-PE")} kg`} icon="wind" tone="info" />
            <StatTile label="Energía" value={`${m.kcal.toLocaleString("es-PE")} kcal`} icon="flame" tone="energy" />
            <StatTile label="Viajes en bici" value={`${m.bikeTrips % BIKE_TRIPS_PER_DAY_OFF} de ${BIKE_TRIPS_PER_DAY_OFF}`} icon="bike" tone="highlight" />
          </div>
          <p className="mt-2 text-xs text-subtle">
            Viajes en bici: en el sector público, la Ley 30936 da un día libre por cada {BIKE_TRIPS_PER_DAY_OFF} viajes certificados. Lo valida tu institución; YIO solo lleva la cuenta.
          </p>

          {/* Oculto hasta que exista un acuerdo real con una billetera (Fase 2): hoy confunde, YIO no es billetera. */}
          {SHOW_WALLET && <WalletPanel loggedIn={p.loggedIn} onLogin={p.onLogin} tappId={p.tappId} onSaveTappId={p.onSaveTappId} />}

          <ul className="mt-6 divide-y divide-line rounded-tile border border-line">
            {p.list.slice(0, 20).map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span className="flex flex-wrap items-center gap-x-2 text-ink">
                  {t.from} <ArrowRight className="size-3.5 text-muted" /> {t.to}
                  <span className="text-muted">· {t.mode === "bus" && t.route ? t.route : modeLabel(t.mode)}{t.km ? ` · ${t.km.toLocaleString("es-PE")} km` : ""}</span>
                  {t.pending && <span className="inline-flex items-center gap-1 text-xs text-warning-text"><CloudOff className="size-3.5" /> por subir</span>}
                </span>
                <span className="flex items-center gap-3 text-muted">
                  {fmtDate(t.date)} · <span className="text-success-text">{soles(t.amount)}</span>
                  {!t.pending && (
                    <button type="button" onClick={() => p.onDelete(t.id)} aria-label={`Borrar ${t.from} → ${t.to}`} className="text-subtle hover:text-danger-text">
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center gap-3 text-sm">
            {confirming ? (
              <>
                <span className="text-muted">¿Borrar todo el historial?</span>
                <button type="button" className="text-danger-text underline" onClick={() => { p.onClear(); setConfirming(false); }}>Sí, borrar</button>
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
      {p.error && <p role="alert" className="mt-4 text-sm text-danger-text">{p.error}</p>}
      {p.loggedIn ? (
        <p className="mt-4 text-xs text-subtle">Guardado en tu cuenta: lo ves desde cualquier dispositivo.</p>
      ) : (
        <p className="mt-4 text-xs text-subtle">
          Se guarda solo en este dispositivo.{" "}
          <button type="button" onClick={p.onLogin} className="text-primary underline">Entra con tu correo</button>{" "}
          para no perderlo.
        </p>
      )}
    </Card>
  );
}
