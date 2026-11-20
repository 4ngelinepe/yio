/**
 * Medición de un viaje real desde el navegador: GPS mientras YIO está abierta y pantalla encendida.
 * No guarda el recorrido punto por punto: solo distancia, tiempo y velocidades.
 * Si el celular se bloquea, el navegador pausa el GPS: se avisa a la persona.
 */
export type TrackState = {
  startedAt: number;
  km: number;
  movingSec: number;
  maxKmh: number;
  last?: { lat: number; lng: number; t: number };
  accuracy?: number;
  paused?: boolean;
  /** Hora del último dato del GPS (aunque no haya sumado). */
  lastFix?: number;
};

export type TripResult = { km: number; minutes: number; avgKmh: number; maxKmh: number; guess: "walk" | "bike-or-bus" | "vehicle" | "unknown" };

const KEY = "yio.trip";
const R = 6371;
const rad = (d: number) => (d * Math.PI) / 180;
const hav = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

export const loadTrip = (): TrackState | null => {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? "null"); return v && typeof v.startedAt === "number" ? v : null; } catch { return null; }
};
const saveTrip = (s: TrackState | null) => { try { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY); } catch { /* noop */ } };

export class Tracker {
  state: TrackState;
  private watch: number | null = null;
  /** Últimos puntos buenos: se promedian para quitar el temblor del GPS. */
  private buf: { lat: number; lng: number }[] = [];
  private lock: { release: () => Promise<void> } | null = null;
  private onVis = () => { if (document.visibilityState === "visible") void this.keepAwake(); };

  constructor(private onUpdate: (s: TrackState) => void, private onError: (msg: string) => void, resume?: TrackState) {
    this.state = resume ?? { startedAt: Date.now(), km: 0, movingSec: 0, maxKmh: 0 };
  }

  start() {
    if (!("geolocation" in navigator)) { this.onError("Este navegador no da la ubicación."); return; }
    saveTrip(this.state);
    this.watch = navigator.geolocation.watchPosition((p) => this.add(p), (e) => {
      this.onError(e.code === e.PERMISSION_DENIED ? "Sin permiso de ubicación: actívalo para medir el viaje." : "No llega la señal de GPS. Seguimos intentando.");
    }, { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
    void this.keepAwake();
    document.addEventListener("visibilitychange", this.onVis);
  }

  private async keepAwake() {
    try {
      const wl = (navigator as unknown as { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock;
      if (wl && !this.lock) this.lock = await wl.request("screen");
    } catch { /* sin bloqueo de pantalla: el aviso ya pide dejarla abierta */ }
  }

  private add(p: GeolocationPosition) {
    const { latitude: lat, longitude: lng, accuracy } = p.coords;
    const t = p.timestamp;
    const s = this.state;
    s.accuracy = Math.round(accuracy);
    // Hubo un hueco largo sin señal: probablemente se bloqueó el celular.
    s.paused = s.lastFix != null && t - s.lastFix > 90_000;
    s.lastFix = t;
    if (accuracy > 80) { saveTrip(s); this.onUpdate({ ...s }); return; } // punto muy impreciso: no suma
    this.buf.push({ lat, lng });
    if (this.buf.length > 5) this.buf.shift();
    const pos = { lat: this.buf.reduce((a, b) => a + b.lat, 0) / this.buf.length, lng: this.buf.reduce((a, b) => a + b.lng, 0) / this.buf.length };
    if (!s.last) { s.last = { ...pos, t }; saveTrip(s); this.onUpdate({ ...s }); return; }
    // Se mide desde un punto ancla: los pasos chicos se acumulan hasta superar el margen de error,
    // y recién ahí se suma el tramo y se mueve el ancla. Así no se cuenta el temblor del GPS estando quieta.
    const dKm = hav(s.last, pos);
    const dt = (t - s.last.t) / 1000;
    if (dt <= 0) return;
    const margin = Math.min(40, Math.max(15, accuracy)) / 1000;
    if (dKm >= margin) {
      const kmh = (dKm / dt) * 3600;
      if (kmh <= 130) { // más rápido que eso es un salto del GPS: se ignora el punto
        s.km += dKm;
        s.movingSec += dt;
        if (dt >= 3) s.maxKmh = Math.max(s.maxKmh, kmh);
        s.last = { ...pos, t };
      }
    }
    saveTrip(s);
    this.onUpdate({ ...s });
  }

  stop(): TripResult {
    if (this.watch !== null) navigator.geolocation.clearWatch(this.watch);
    document.removeEventListener("visibilitychange", this.onVis);
    void this.lock?.release().catch(() => {});
    saveTrip(null);
    const s = this.state;
    const minutes = Math.max(1, Math.round((Date.now() - s.startedAt) / 60000));
    const avgKmh = s.movingSec > 30 ? (s.km / s.movingSec) * 3600 : 0;
    const guess = s.km < 0.2 ? "unknown" : avgKmh < 7 ? "walk" : avgKmh < 22 && s.maxKmh < 40 ? "bike-or-bus" : "vehicle";
    return { km: Math.round(s.km * 100) / 100, minutes, avgKmh: Math.round(avgKmh * 10) / 10, maxKmh: Math.round(s.maxKmh), guess };
  }

  cancel() { this.stop(); }
}
