import { useState } from "react";
import { LogIn, Menu, X } from "lucide-react";
import { brand } from "../config/brand";
import { menuLinks } from "../data/content";

type Props = { email: string | null; onLogin: () => void; onLogout: () => void };

const nameFrom = (email: string) => email.split("@")[0];

export function Header({ email, onLogin, onLogout }: Props) {
  const [open, setOpen] = useState(false);

  const account = email ? (
    <>
      <span className="truncate">Hola, {nameFrom(email)}</span>
      <span className="text-subtle">·</span>
      <button type="button" onClick={onLogout} className="hover:text-ink">Salir</button>
    </>
  ) : (
    <button type="button" onClick={onLogin} className="inline-flex items-center gap-1.5 rounded-control px-3 py-1.5 text-primary hover:bg-primary-soft">
      <LogIn className="size-4" /> Entrar
    </button>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="#" className="flex min-w-0 items-center gap-3">
          {brand.logoSrc ? (
            <img src={brand.logoSrc} alt={brand.productName} className="h-8 w-auto" />
          ) : (
            <span className="grid h-8 min-w-8 place-items-center rounded-control bg-primary px-1.5 text-xs font-semibold text-primary-fg">
              {brand.logoMark}
            </span>
          )}
          <span className="hidden text-subtle sm:inline">|</span>
          <span className="hidden truncate text-sm text-muted sm:inline">{brand.siteName}</span>
        </a>

        <div className="flex min-w-0 items-center gap-2 text-sm text-muted">
          <div className="flex min-w-0 items-center gap-3">{account}</div>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="main-menu"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            className="grid size-10 shrink-0 place-items-center rounded-control text-ink hover:bg-surface-muted"
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="main-menu" className="border-t border-line bg-surface">
          <ul className="mx-auto max-w-6xl px-4 py-2 sm:px-6">
            {menuLinks.map((l) => (
              <li key={l.label}>
                <a href={l.href} onClick={() => setOpen(false)} className="block rounded-control px-3 py-3 text-ink hover:bg-surface-muted">
                  {l.label}
                </a>
              </li>
            ))}
            {email && <li className="px-3 py-3 text-sm text-muted">Sesión: {email}</li>}
          </ul>
        </nav>
      )}
    </header>
  );
}
