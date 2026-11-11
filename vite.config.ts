import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Rutas relativas: funciona en GitHub Pages (/yio/) y en cualquier hosting
  base: "./",
  plugins: [react(), tailwindcss()],
});
