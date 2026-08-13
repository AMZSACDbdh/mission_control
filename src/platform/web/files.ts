import type { FileAdapter } from "../types";

/**
 * Saving a file from the browser: a Blob, an object URL, and a synthetic click.
 *
 * A Tauri build replaces this with a native save dialog writing straight to
 * disk, which is why the awkward anchor dance is confined to this one file
 * rather than living inside the backup logic.
 */
export function createWebFiles(): FileAdapter {
  return {
    async saveText(suggestedName, contents, mimeType = "application/json") {
      const blob = new Blob([contents], { type: mimeType });
      const url = URL.createObjectURL(blob);
      try {
        const a = document.createElement("a");
        a.href = url;
        a.download = suggestedName;
        a.click();
      } finally {
        URL.revokeObjectURL(url);
      }
    },
  };
}
