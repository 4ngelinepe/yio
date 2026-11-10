# GEO · Wireframe MVP

Recomendador de corredores para caminar: el usuario elige qué busca hoy (moverse rápido, ahorrar, evitar tráfico, sentirse mejor) y GEO le dice si conviene caminar el tramo, cuánto ahorra y cómo se compara con taxi o bus.

**Demo en vivo:** https://4ngelinepe.github.io/geo-wireframe-mvp/

Este repo es un **MVP en wireframe**: la estructura, el flujo y los componentes están resueltos; la marca se enchufa después cambiando un solo archivo.

## Correr el proyecto

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + build a /dist
```

Previsualiza cualquier tema con `?theme=wireframe`, `?theme=geo` o `?theme=av`, o con el selector flotante abajo a la izquierda.

## Cómo ponerle marca

La marca vive en dos lugares. Los componentes **no tienen colores ni fuentes escritas a mano**: solo usan tokens.

| Qué cambia | Dónde |
|---|---|
| Colores, tipografía, radios, sombras | `src/themes/<marca>.css` |
| Logo, nombre del producto, sitio, imagen del mapa | `src/config/brand.ts` |
| Textos y números (mock) | `src/data/content.ts` |

### Agregar una marca nueva

1. Duplica `src/themes/wireframe.css` → `src/themes/mimarca.css` y cambia el selector a `[data-theme="mimarca"]`.
2. Cambia los valores de las variables. **No agregues ni quites variables**: todas las marcas comparten el mismo contrato.
3. Impórtalo en `src/styles.css`.
4. Agrega `"mimarca"` al arreglo `themes` en `src/config/brand.ts` y, si quieres, ponlo como `defaultTheme`.
5. Si la marca usa una fuente web, agrégala en `index.html`.

### El contrato de tokens

- **Base:** `--bg`, `--surface`, `--surface-muted`, `--border`, `--text`, `--text-muted`, `--text-subtle`
- **Primario:** `--primary`, `--primary-fg`, `--primary-soft`, `--primary-text`
- **Tonos semánticos:** `info`, `success`, `warning`, `danger`, `highlight`, `energy` y `neutral`. Cada uno con `--x` (sólido), `--x-soft` (fondo), `--x-border` y `--x-text`.
- **Forma:** `--radius-sm`, `--radius-md`, `--radius-lg`, `--shadow`
- **Tipo:** `--font-body`, `--font-heading`

Los tonos tienen significado, no color: `success` = opción recomendada / corredor respirable; `warning` = moderado / congestión; `danger` = evitar / destino; `highlight` y `energy` = métricas secundarias. Cada marca decide qué color le da a cada significado.

## Estructura

```
src/
  App.tsx                    flujo: objetivo → calcular → resultados
  config/brand.ts            identidad (logo, nombres, tema por defecto)
  data/content.ts            contenido mock + getRecommendation(goal)
  themes/*.css               una marca por archivo
  styles.css                 puente Tailwind ↔ tokens
  lib/tones.ts               tono semántico → clases
  components/
    Header.tsx               logo, saludo, menú hamburguesa
    DailyRecommendation.tsx  clima + "¿Qué buscas hoy?" + CTA
    CorridorStatus.tsx       estado del corredor (semáforo de 3 niveles)
    MapSection.tsx           mapa con ruta origen → vía → destino
    RouteSummary.tsx         métricas de hoy + guardar ahorro
    DirectComparison.tsx     taxi/bus vs caminar (recomendado)
    CumulativeImpact.tsx     impacto si se repite 20 días/mes
    InspirationalQuote.tsx   frase de cierre
    Footer.tsx
    Floating.tsx             botón de ayuda + selector de temas
    ui/                      Card, Button, IconTile, StatTile, Icon
```

## Siguientes pasos para el back

- Reemplazar `getRecommendation()` en `src/data/content.ts` por la llamada a la API. Debe devolver el tipo `Recommendation` tal cual.
- Clima real en `weather` y usuario real en `brand.userName`.
- "Guardar mi ahorro" hoy solo cambia de estado en pantalla; conectarlo al endpoint de ahorros.
- `MapSection` tiene un slot de imagen: cambiarlo por un mapa real (Mapbox/Leaflet) cuando haya coordenadas.
- Apagar `showThemeSwitcher` en producción.
