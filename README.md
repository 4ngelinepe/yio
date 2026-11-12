# YIO

**Por el bienestar común.** ¿Camino, bici o bus? YIO compara caminar, bici, scooter, bus o Metro y el taxi para tu tramo, con el clima, el aire y la hora punta de ahora, y te dice qué conviene según lo que buscas hoy: **llegar rápido, ahorrar plata o moverte más**.

**Demo en vivo:** https://4ngelinepe.github.io/yio/ · **Arquitectura completa:** [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md)

Fase 1: uso personal y con amigos. (Antes `geo-wireframe-mvp`; es el mismo proyecto.)

## Qué hace hoy

- **Dos modos:** por corredor (Corredor Rojo, Expreso San Isidro, Metro Línea 1) o **por dirección** (a pie, en bici o combinado: a pie + bus o Metro).
- Llegadas en vivo del Rojo y del Expreso; tiempos reales a pie y en bici por calles (OpenRouteService).
- Clima, UV y calidad del aire en vivo (Open-Meteo); hora punta; modo día/noche según la hora.
- Ruta en bici con el % que va sobre ciclovía (Pedalea Seguro 2.0).
- Login sin contraseña y "Mis ahorros" en la nube (Supabase). Sin sesión, se guarda en el dispositivo.
- App instalable con modo sin conexión. Guía "¿Cómo funciona?" para usuarios nuevos.
- Iconografía limeña por Alfabeto Visual.

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
| Tiempos a pie y en bici | OpenRouteService (OpenStreetMap) vía Edge Function, clave en secreto ORS_KEY | `supabase/functions/street-times` |
| Llegadas en vivo · Expreso | Zenbus (protobuf) vía Edge Function, con horario programado de respaldo | `supabase/functions/esi-arrivals` |
| Estaciones del Metro Línea 1 | OpenStreetMap | `src/data/metro.json` |
| Ciclovías y cicloparqueaderos | Pedalea Seguro 2.0 (ArcGIS) | `src/lib/bikes.ts` |
| Buscador de lugares | Nominatim (OpenStreetMap) | `src/lib/live.ts` |

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
