/**
 * Todo lo que cambia de una marca a otra (aparte de los colores, que viven en src/themes).
 */
export const themes = ["wireframe", "geo", "av"] as const;
export type ThemeName = (typeof themes)[number];

export const brand = {
  /** Texto del isotipo/logo en el header. Reemplazar por <img> cuando haya logo. */
  logoMark: "GEO",
  /** Ruta a un logo en /public (ej. "/logo.svg"). Si existe, reemplaza a logoMark. */
  logoSrc: "" as string,
  productName: "GEO",
  siteName: "Una idea de Angie Saravia Gigante",
  userName: "Usuario",
  defaultTheme: "geo" as ThemeName,
  /** Muestra el selector de temas flotante. Apagar en producción. */
  showThemeSwitcher: false,
  /** Imagen de fondo del mapa (en /public). Vacío = placeholder rayado. */
  mapImage: "" as string,
  year: 2026,
};
