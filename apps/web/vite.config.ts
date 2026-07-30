import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

// HTTPS is opt-in (DEV_HTTPS=1, set by scripts/dev-lan.sh) so plain `pnpm dev`
// and the e2e suite keep working over HTTP. Requires certs from
// scripts/dev-cert.sh; enables camera access from phones on the LAN.
function httpsConfig(): { key: Buffer; cert: Buffer } | undefined {
  if (process.env.DEV_HTTPS !== "1") return undefined;
  const certsDir = path.resolve(__dirname, "../../certs");
  const keyPath = path.join(certsDir, "dev-key.pem");
  const certPath = path.join(certsDir, "dev-cert.pem");
  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) return undefined;
  return { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
}

export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(__dirname, "../.."),
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        "service-worker": path.resolve(__dirname, "src/service-worker.ts"),
      },
      output: {
        entryFileNames: (chunkInfo) =>
          chunkInfo.name === "service-worker" ? "[name].js" : "assets/[name]-[hash].js",
      },
    },
  },
  server: {
    port: 5173,
    // Bind to all interfaces so the app can be reached from other devices on
    // the same network (e.g. an iPhone during local mobile testing).
    host: true,
    https: httpsConfig(),
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:3001",
        changeOrigin: true,
      },
      "/uploads": {
        target: process.env.VITE_API_URL || "http://localhost:3001",
        changeOrigin: true,
      },
      // Socket.IO connects same-origin when VITE_API_URL is blank (dev-lan
      // mode); forward it to the API like the other paths.
      "/socket.io": {
        target: process.env.VITE_API_URL || "http://localhost:3001",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  preview: {
    port: 5173,
    host: true,
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:3001",
        changeOrigin: true,
      },
      "/uploads": {
        target: process.env.VITE_API_URL || "http://localhost:3001",
        changeOrigin: true,
      },
      "/socket.io": {
        target: process.env.VITE_API_URL || "http://localhost:3001",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
