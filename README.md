# YIO

**Por el bienestar común.** ¿Camino, bici o bus? YIO compara caminar, bici, scooter, el bus del corredor y el taxi para tu tramo, con el clima y el aire de ahora, y te dice qué conviene según lo que buscas hoy: moverte rápido, ahorrar, evitar tráfico o sentirte mejor.

**Demo en vivo:** https://4ngelinepe.github.io/yio/

Fase 1: uso personal y con amigos. Corredores: Corredor Rojo y Expreso San Isidro. (Antes `geo-wireframe-mvp`; si encuentras ese nombre en algún lado, es el mismo proyecto.)

## Qué hace hoy

- Corredor Rojo: 144 paraderos (rutas 201, 204, 206, 209), con llegadas en vivo.
- Expreso San Isidro: 3 rutas circulares, gratuito y eléctrico (sin llegadas en vivo aún).
- Bici y scooter propios como opciones; app instalable con modo offline.
- Recomendación caminar vs. bus con reglas transparentes (ver `src/lib/engine.ts`). El taxi se usa solo como referencia de ahorro.
- Clima y calidad del aire en vivo (Open-Meteo).
- Llegadas del bus en vivo vía intermediarios (`supabase/functions/rojo-arrivals` y `esi-arrivals`); si no responden, usa espera estimada.
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
| Paraderos y rutas del Rojo | ubicATUbus (app.corredorrojo.pe), snapshot 10 nov 2026 | `src/data/rojo.json`, `src/data/networks.ts` |
| Paraderos y rutas del Expreso San Isidro | Zenbus (Municipalidad de San Isidro), snapshot 11 nov 2026 | `src/data/esi.json`, `src/data/networks.ts` |
| Corredores Azul y Morado (aún sin uso: faltan coordenadas) | Webs oficiales y portal QR de la ATU | `src/data/bus-routes.ts` |
| Clima y aire | Open-Meteo (gratis, no comercial) | `src/lib/live.ts` |
| Llegadas en vivo · Rojo | API del Rojo vía Edge Function | `supabase/functions/rojo-arrivals` |
| Llegadas en vivo · Expreso | Zenbus (protobuf) vía Edge Function, con horario programado de respaldo | `supabase/functions/esi-arrivals` |

El API del Rojo y los datos de Zenbus no son públicos para terceros: el uso en Fase 1 es moderado y personal. Antes de cualquier uso comercial, pedir permiso a la ATU/operador y a la Municipalidad de San Isidro.

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
