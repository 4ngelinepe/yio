# YIO

**Por el bienestar común.** ¿Camino o tomo el bus? YIO compara caminar, el Corredor Rojo y el taxi para tu tramo, con el clima y el aire de ahora, y te dice qué conviene según lo que buscas hoy: moverte rápido, ahorrar, evitar tráfico o sentirte mejor.

**Demo en vivo:** https://4ngelinepe.github.io/yio/

Fase 1: uso personal y con amigos, solo Corredor Rojo. (Antes `geo-wireframe-mvp`; si encuentras ese nombre en algún lado, es el mismo proyecto.)

## Qué hace hoy

- Tramos entre 144 paraderos del Corredor Rojo (rutas 201, 204, 206, 209).
- Recomendación caminar vs. bus con reglas transparentes (ver `src/lib/engine.ts`). El taxi se usa solo como referencia de ahorro.
- Clima y calidad del aire en vivo (Open-Meteo).
- Llegadas del bus en vivo vía intermediario (`supabase/functions/rojo-arrivals`); si no responde, usa espera estimada.
- Mapa del tramo (Leaflet + OpenStreetMap).
- Login sin contraseña (link al correo) y "Mis ahorros" en la nube con Supabase. Sin sesión, se guarda en el dispositivo.

## Correr el proyecto

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + build a /dist
```

Cada push a `main` se publica solo en GitHub Pages (`.github/workflows/deploy.yml`).

## Datos y fuentes

| Dato | Fuente | Archivo |
|---|---|---|
| Paraderos y rutas del Rojo | ubicATUbus (app.corredorrojo.pe), snapshot 10 nov 2026 | `src/data/rojo.json`, `src/data/rojo.ts` |
| Corredores Azul y Morado (aún sin uso) | Webs oficiales | `src/data/bus-routes.ts` |
| Clima y aire | Open-Meteo (gratis, no comercial) | `src/lib/live.ts` |
| Llegadas en vivo | API del Rojo vía Edge Function | `supabase/functions/rojo-arrivals` |

El API del Rojo no es público para terceros: el uso en Fase 1 es moderado y personal. Antes de cualquier uso comercial, pedir permiso a la ATU/operador.

## Supabase

- Proyecto: `geo` (región us-west-2), nombre interno previo a YIO.
- Esquema y reglas de seguridad (RLS): `supabase/schema.sql`, se pega en SQL Editor.
- La URL y la llave *publishable* en `src/lib/supabase.ts` son públicas por diseño. **Nunca** poner la llave *secret/service_role* en el código.

## Marca enchufable

Los componentes solo usan tokens. Para cambiar de marca:

| Qué cambia | Dónde |
|---|---|
| Colores, tipografía, radios, sombras | `src/themes/<marca>.css` |
| Logo, nombres | `src/config/brand.ts` |
| Textos fijos | `src/data/content.ts` |

Para agregar una marca: duplicar `src/themes/wireframe.css`, cambiar el selector a `[data-theme="mimarca"]` y los valores (sin agregar ni quitar variables), importarlo en `src/styles.css` y sumarlo a `themes` en `brand.ts`.

## Siguiente

- Fase 1: invitar amigos y medir uso real.
- Fase 2: API y widget marca blanca para billeteras (TAPP).
