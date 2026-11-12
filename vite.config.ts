import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
  server: {
    host: "0.0.0.0",
    port: Number(process.env.PORT || 8443),
    strictPort: true,
    proxy: { "/api": { target: "http://127.0.0.1:8000", changeOrigin: true } },
  },
  preview: { host: "0.0.0.0", port: Number(process.env.PORT || 8443) },
  // Two pages: the main app and the SENSE Opportunity Explorer at /sense.html
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(import.meta.dirname, "index.html"),
        sense: path.resolve(import.meta.dirname, "sense.html"),
        onepager: path.resolve(import.meta.dirname, "sense-onepager.html"),
        slides: path.resolve(import.meta.dirname, "slides.html"),
      },
    },
  },
});

