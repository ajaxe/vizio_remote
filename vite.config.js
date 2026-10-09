import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";
import path from "path";

export default defineConfig({
  root: "client",
  plugins: [vue(), vuetify({ autoImport: true })],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@types": path.resolve(__dirname, "types"),
    },
  },
  server: {
    port: 5173,
    host: "localhost",
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
    ws: {
      host: "localhost",
      port: 5173,
      clientPort: 5173,
    },
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
});
