// After the Tauri SPA build, TanStack Start's prerender writes _shell.html.
// Tauri's webview needs index.html as the entry point — copy it.
import { copyFileSync, existsSync } from "fs";

const src = "dist/client/_shell.html";
const dest = "dist/client/index.html";

if (existsSync(src)) {
  copyFileSync(src, dest);
  console.log(`[rename-shell] ${src} → ${dest}`);
} else {
  console.error(`[rename-shell] ERROR: ${src} not found — Tauri build will fail`);
  process.exit(1);
}
