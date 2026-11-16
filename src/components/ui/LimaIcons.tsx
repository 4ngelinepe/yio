/**
 * Iconografía limeña · versión YIO.
 * Derivada del set "Iconografía limeña" de Alfabeto Visual (Figma: Fachadas de lima › YIO).
 * Trazo de 1.5 px (más fino que los funcionales de lucide, 1.75) y color heredado (currentColor). Solo para momentos de identidad:
 * día/noche y carga, bienvenida y estados vacíos, sin conexión, llegada y logros. Los íconos funcionales siguen con lucide.
 */
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { title?: string };

function Base({ title, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth={1.5}
      strokeLinecap="round" strokeLinejoin="round" role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true} aria-label={title} {...rest}
    >
      {children}
    </svg>
  );
}

/** Farol de pared. `lit`: encendido (noche), con cristal y rayos en ámbar. */
export function Farol({ lit = false, ...p }: P & { lit?: boolean }) {
  const amber = "#F59E0B";
  return (
    <Base {...p}>
      <path d="M4 3v18" />
      <path d="M4 8h7a3 3 0 0 1 3 3" />
      <path d="M4 13c3 0 4.5-2 5.5-5" />
      <path d="M11.5 13.2l2.5-1.7 2.5 1.7z" />
      <path d="M11.8 13.2l.8 5.8h2.8l.8-5.8z" fill={lit ? amber : "none"} fillOpacity={lit ? 0.35 : undefined} />
      <path d="M13 19v1.5h2V19" />
      {lit && <path d="M19 13.2l1.6-.9M19.4 16.2h1.8M18.6 19.1l1.4.9" stroke={amber} />}
    </Base>
  );
}

export const BalconCajon = (p: P) => (
  <Base {...p}>
    <path d="M3 5h18" /><path d="M4 5v10h16V5" /><path d="M4 11h16" /><path d="M8 5v6M12 5v6M16 5v6" />
    <path d="M5 15l2 4M19 15l-2 4" /><path d="M10 15l.8 2.5M14 15l-.8 2.5" />
  </Base>
);

export const PortadaArco = (p: P) => (
  <Base {...p}>
    <path d="M7 21V11a5 5 0 0 1 10 0v10" /><path d="M4.5 21V11a7.5 7.5 0 0 1 15 0v10" />
    <path d="M12 3.5v2" /><path d="M7 11.5h10" /><path d="M12 11.5V21" /><path d="M3 21h18" />
  </Base>
);

export const Venera = (p: P) => (
  <Base {...p}>
    <path d="M5 13a7 7 0 0 1 14 0z" /><path d="M12 13V6M12 13l-4.5-5M12 13l4.5-5" />
    <path d="M7 13v8M17 13v8" /><path d="M3.5 21h17" />
  </Base>
);

export const RemateDeco = (p: P) => (
  <Base {...p}>
    <path d="M5 21V9h3V6h2V3h4v3h2v3h3v12" /><path d="M12 3v5" /><path d="M8.5 12h7v6h-7z" /><path d="M12 12v6" />
  </Base>
);

/** Ventana con reja: 2 barrotes (versión YIO). Uso: búsqueda sin resultados. */
export const VentanaReja = (p: P) => (
  <Base {...p}>
    <path d="M7.5 4.5c1.5-1.7 3-1.7 4.5 0c1.5-1.7 3-1.7 4.5 0" />
    <path d="M6 20V8a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v12" /><path d="M10 7v13M14 7v13" /><path d="M6 12h12" /><path d="M4 20h16" />
  </Base>
);

/** Puerta tallada: molduras de una línea (versión YIO). Uso: sin conexión. */
export const PuertaTallada = (p: P) => (
  <Base {...p}>
    <path d="M6 20V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14" /><path d="M12 4v16" />
    <path d="M9 7.5v4.5M15 7.5v4.5" /><path d="M9 15v2M15 15v2" /><path d="M4 20h16" />
  </Base>
);

/** Huaca de adobe escalonada en terrazas, con adobes "en librero" (Pucllana, Huallamarca). */
export const Huaca = (p: P) => (
  <Base {...p}>
    <path d="M2 20h20" /><path d="M3 20v-3h3v-3h3v-3h6v3h3v3h3v3" />
    <path d="M6 18v.5M9 18v.5M12 18v.5M15 18v.5M18 18v.5M10.5 15v.5M13.5 15v.5" />
  </Base>
);

/** Cactus columnar San Pedro: tres tallos que nacen del suelo. */
export const Cactus = (p: P) => (
  <Base {...p}>
    <path d="M10 21V5a2 2 0 0 1 4 0v16" /><path d="M5.5 21v-8.5a1.5 1.5 0 0 1 3 0V21" />
    <path d="M15.5 21v-6a1.5 1.5 0 0 1 3 0v6" /><path d="M12 5.5v4M12 12v5" /><path d="M4 21h16" />
  </Base>
);
