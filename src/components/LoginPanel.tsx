import { useState } from "react";
import { Loader2, Mail, X } from "lucide-react";
import { redirectUrl, supabase } from "../lib/supabase";
import { Button } from "./ui/primitives";

type State = { kind: "idle" } | { kind: "sending" } | { kind: "sent"; email: string } | { kind: "error"; msg: string };

export function LoginPanel({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setState({ kind: "error", msg: "Revisa el correo, parece incompleto." });
      return;
    }
    setState({ kind: "sending" });
    const { error } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { emailRedirectTo: redirectUrl(), shouldCreateUser: true },
    });
    if (error) {
      const msg = /rate|limit/i.test(error.message)
        ? "Se enviaron muchos correos seguidos. Espera unos minutos y vuelve a intentar."
        : "No se pudo enviar el correo. Intenta de nuevo en un momento.";
      setState({ kind: "error", msg });
      return;
    }
    setState({ kind: "sent", email: clean });
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="login-title" className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <h2 id="login-title" className="text-xl text-ink">Entra a GEO</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="grid size-9 place-items-center rounded-control text-muted hover:bg-surface-muted">
            <X className="size-5" />
          </button>
        </div>

        {state.kind === "sent" ? (
          <div className="mt-4 space-y-3 text-muted">
            <p className="flex items-center gap-2 text-ink"><Mail className="size-5 text-success" /> Revisa tu correo</p>
            <p>Te enviamos un link a <strong className="text-ink">{state.email}</strong>. Ábrelo y entras directo, sin contraseña.</p>
            <p className="text-sm">Si no llega en un par de minutos, revisa spam o promociones.</p>
            <Button variant="secondary" className="mt-2 w-full" onClick={onClose}>Listo</Button>
          </div>
        ) : (
          <form onSubmit={send} className="mt-4 space-y-4">
            <p className="text-muted">Sin contraseñas: te mandamos un link a tu correo. Así tus ahorros quedan guardados en tu cuenta.</p>
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-sm text-muted">Correo</label>
              <input
                id="login-email" type="email" autoComplete="email" inputMode="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full rounded-tile border-2 border-line bg-surface-muted px-4 py-3 text-lg text-ink focus:border-primary"
              />
            </div>
            {state.kind === "error" && <p role="alert" className="text-sm text-danger-text">{state.msg}</p>}
            <Button type="submit" className="w-full" disabled={state.kind === "sending"}
              icon={state.kind === "sending" ? <Loader2 className="size-5 animate-spin" /> : null}>
              {state.kind === "sending" ? "Enviando…" : "Enviarme el link"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
