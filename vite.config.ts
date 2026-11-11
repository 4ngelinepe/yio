import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // Rutas relativas: funciona en GitHub Pages (/yio/) y en cualquier hosting
  base: "./",
  plugins: [
    react(),
    tailwindcss(),
    // App instalable + modo offline. La app y los 272 paraderos quedan guardados en el teléfono;
    // clima, aire, llegadas y Supabase siempre van a la red (si no hay, la app usa estimados).
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "apple-touch-icon.png"],
      manifest: {
        name: "YIO · Por el bienestar común",
        short_name: "YIO",
        description: "¿Camino, bici o bus? YIO te dice qué conviene en tu tramo del Corredor Rojo.",
        lang: "es-PE",
        start_url: "./",
        scope: "./",
        display: "standalone",
        background_color: "#f8fafc",
        theme_color: "#2563eb",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            // Tiles del mapa: se reusan los ya vistos si no hay señal
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\//,
            handler: "CacheFirst",
            options: { cacheName: "osm-tiles", expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 14 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "fonts" },
          },
        ],
      },
    }),
  ],
});
