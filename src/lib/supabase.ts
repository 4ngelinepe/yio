/**
 * Conexión a Supabase (login + base de datos + funciones).
 * La URL y la llave publishable son públicas por diseño: lo que protege los datos
 * son las reglas RLS de supabase/schema.sql. NUNCA poner aquí la llave secret/service_role.
 */
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://dqrvabedvcqfvbpipiye.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_MWuO68Osqtpn_C2KpLLEDQ_3yMuKdK7";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    // "implicit" permite abrir el link del correo en otro navegador o en el celular.
    flowType: "implicit",
    persistSession: true,
    detectSessionInUrl: true,
  },
});

/** Intermediario de llegadas en vivo del Corredor Rojo (supabase/functions/rojo-arrivals). */
export const ARRIVALS_URL = `${SUPABASE_URL}/functions/v1/rojo-arrivals`;
export const ESI_ARRIVALS_URL = `${SUPABASE_URL}/functions/v1/esi-arrivals`;

/** A dónde vuelve el usuario después de tocar el link del correo. */
export const redirectUrl = () => location.origin + location.pathname;
