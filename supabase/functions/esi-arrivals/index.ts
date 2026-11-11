// YIO · Intermediario de llegadas del Expreso San Isidro (Zenbus)
// Supabase → Edge Functions → Deploy a new function → Via Editor
// Nombre de la función: esi-arrivals
// Importante: desactivar "Verify JWT" (datos públicos, la web la llama sin sesión).
//
// Uso: GET ?itinerary=<id de ruta>&index=<posición del paradero en la ruta>
// Respuesta: { minutes, source: "live" | "schedule" }  o  { minutes: null, reason }
//
// Zenbus responde en protobuf (zenbus.proto, mensaje LiveMessage). Aquí se lee solo lo necesario:
//   LiveMessage.timetable(1) → Timetable.midnight(6), Timetable.column(7) → TripColumn
//   TripColumn: aimed(1) programado, estimactual(4) estimado en vivo, previous_index(2),
//               jtfs_schedule_relationship(14: 1 = programado, 100 = en vivo), trip_status(15: 3 = archivado)
//   StopTime: stop_index_in_itinerary(1), arrival(5), departure(6), arriparture(7), no_time(17)
// Se guarda la respuesta 30 s por ruta para no cargar a Zenbus.

const ALIAS = "limasanisidromibus77868410";
const ITINERARIES = new Set(["4833603738402816", "4875485524787200", "822910079", "824990256"]);
const TTL_MS = 30_000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "public, max-age=30" },
  });

/* ── Lector mínimo de protobuf ── */
type Field = [number, bigint | Uint8Array | null];
function fields(buf: Uint8Array): Field[] {
  const out: Field[] = [];
  let p = 0;
  const varint = () => {
    let r = 0n, s = 0n, b: number;
    do { b = buf[p++]; r |= BigInt(b & 127) << s; s += 7n; } while (b & 128);
    return r;
  };
  while (p < buf.length) {
    const key = Number(varint());
    const f = key >> 3, wt = key & 7;
    if (wt === 0) out.push([f, varint()]);
    else if (wt === 2) { const l = Number(varint()); out.push([f, buf.subarray(p, p + l)]); p += l; }
    else if (wt === 5) { out.push([f, null]); p += 4; }
    else if (wt === 1) { out.push([f, null]); p += 8; }
    else throw new Error("wire type " + wt);
  }
  return out;
}
const int = (v: Field[1]) => (typeof v === "bigint" ? Number(BigInt.asIntN(64, v)) : 0);

type Cand = { at: number; source: "live" | "schedule" };

/** Próxima llegada al paradero `index`, en segundos desde la medianoche del servicio. */
export function nextArrival(buf: Uint8Array, index: number, nowUtcSec: number): { at: number; source: Cand["source"]; midnight: number } | null {
  let best: (Cand & { midnight: number }) | null = null;
  for (const [f, tt] of fields(buf)) {
    if (f !== 1 || !(tt instanceof Uint8Array)) continue;
    const ttf = fields(tt);
    const midnight = int(ttf.find(([g]) => g === 6)?.[1] ?? null);
    const now = nowUtcSec - midnight;
    for (const [g, col] of ttf) {
      if (g !== 7 || !(col instanceof Uint8Array)) continue;
      const c = fields(col);
      const sc = (n: number) => int(c.find(([h]) => h === n)?.[1] ?? null);
      const rel = sc(14), status = sc(15), prev = sc(2);
      if (status === 3) continue; // viaje terminado
      const live = rel === 100;
      if (live && prev >= index) continue; // el bus ya pasó por ese paradero
      if (!live) {
        // Programado que ya debió salir y no aparece en vivo: probablemente no corre. No lo prometemos.
        const starts = c
          .filter(([h, st]) => h === 1 && st instanceof Uint8Array)
          .map(([, st]) => { const s = fields(st as Uint8Array); const v = (n: number) => int(s.find(([k]) => k === n)?.[1] ?? null); return v(6) || v(7) || v(5); })
          .filter(Boolean);
        if (starts.length && Math.min(...starts) < now - 120) continue;
      }
      for (const [h, st] of c) {
        if (h !== (live ? 4 : 1) || !(st instanceof Uint8Array)) continue;
        const s = fields(st);
        const v = (n: number) => int(s.find(([k]) => k === n)?.[1] ?? null);
        if (v(1) !== index || v(17)) continue;
        const at = live ? v(5) || v(7) : v(6) || v(7) || v(5);
        if (!at || at < now - 30) continue;
        if (!best || at + midnight < best.at + best.midnight) best = { at, midnight, source: live ? "live" : "schedule" };
      }
    }
  }
  return best;
}

const cache = new Map<string, { t: number; buf: Uint8Array }>();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET") return json({ error: "Solo GET" }, 405);

  const q = new URL(req.url).searchParams;
  const itinerary = q.get("itinerary") ?? "";
  const index = Number(q.get("index"));
  if (!ITINERARIES.has(itinerary)) return json({ error: "itinerary inválido" }, 400);
  if (!Number.isInteger(index) || index < 0 || index > 60) return json({ error: "index inválido" }, 400);

  try {
    let hit = cache.get(itinerary);
    if (!hit || Date.now() - hit.t > TTL_MS) {
      const up = await fetch(`https://zenbus.net/publicapp/poll?alias=${ALIAS}&itinerary=${itinerary}`, {
        headers: { Accept: "application/x-protobuf" },
        signal: AbortSignal.timeout(5000),
      });
      if (!up.ok) return json({ minutes: null, reason: "zenbus" }, 502);
      hit = { t: Date.now(), buf: new Uint8Array(await up.arrayBuffer()) };
      cache.set(itinerary, hit);
    }
    const nowSec = Date.now() / 1000;
    const next = nextArrival(hit.buf, index, nowSec);
    if (!next) return json({ minutes: null, reason: "sin-salidas" });
    const minutes = Math.max(0, Math.round((next.midnight + next.at - nowSec) / 60));
    return json({ minutes, source: next.source });
  } catch {
    return json({ minutes: null, reason: "error" }, 502);
  }
});
