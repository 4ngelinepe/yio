// GEO · Intermediario de llegadas en vivo del Corredor Rojo
// Supabase → Edge Functions → Deploy a new function → Via Editor
// Nombre de la función: rojo-arrivals
// Importante: desactivar "Verify JWT" (datos públicos, la web la llama sin sesión).
//
// Solo reenvía la predicción de UN paradero, con caché corto, para no cargar al API del Rojo.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const json = (body: string, status = 200, extra: Record<string, string> = {}) =>
  new Response(body, { status, headers: { ...CORS, "Content-Type": "application/json", ...extra } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET") return json('{"error":"Solo GET"}', 405);

  const stopId = new URL(req.url).searchParams.get("stopId") ?? "";
  if (!/^\d{1,5}$/.test(stopId)) return json('{"error":"stopId inválido"}', 400);

  try {
    const upstream = await fetch(
      `https://app.corredorrojo.pe/api/prediccion/${stopId}?code=${stopId}&scope=corredor-rojo`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000) },
    );
    if (!upstream.ok) return json("[]", 502);
    const body = await upstream.text();
    return json(body, 200, { "Cache-Control": "public, max-age=20" });
  } catch {
    return json("[]", 502);
  }
});
