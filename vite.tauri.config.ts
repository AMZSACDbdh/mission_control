/**
 * Vite config for the Tauri desktop build.
 *
 * Differences from vite.config.ts (the web/Cloudflare build):
 *   - nitro: false    — no server bundle; Tauri hosts the frontend itself
 *   - spa.enabled     — single HTML entry point; all routing is client-side
 *   - outDir: "dist"  — Tauri's frontendDist points to ../dist/client
 *
 * After this build, scripts/rename-shell.mjs copies dist/client/_shell.html
 * → dist/client/index.html so Tauri's webview can find the entry point.
 * That step is handled by the build:spa npm script, not here, because
 * TanStack Start's prerender runs after Vite's closeBundle hook fires.
 *
 * The web build (npm run build) is completely unchanged.
 */
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
    spa: { enabled: true },
  },
  nitro: false,
  vite: {
    build: { outDir: "dist" },
  },
});
