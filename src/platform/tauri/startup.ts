import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import type { StartupAdapter } from "../types";

/**
 * Launch-at-sign-in, backed by `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`.
 *
 * That key is the plainest mechanism Windows offers for this: per-user, so it
 * needs no elevation; visible and switchable in Task Manager's Startup tab, so
 * the user is never fighting a setting they cannot find; and removed by the
 * uninstaller hook in `src-tauri/windows/hooks.nsi`.
 *
 * The Run key fires once, at sign-in. It deliberately does not fire on resume
 * from sleep — see the note on `canAutostart` in `platform/tauri/index.ts`.
 *
 * Every call re-reads the real state afterwards instead of assuming the write
 * landed. If the registry write is refused, the caller is told what is actually
 * true and the toggle corrects itself, rather than showing an "on" that Windows
 * never agreed to.
 */
export function createTauriStartup(): StartupAdapter {
  const current = async (): Promise<boolean> => {
    try {
      return await isEnabled();
    } catch (e) {
      // An unreadable registry is not a reason to break Settings.
      console.error("Could not read the startup registration", e);
      return false;
    }
  };

  return {
    isEnabled: current,

    async setEnabled(next) {
      try {
        if (next) await enable();
        else await disable();
      } catch (e) {
        console.error("Could not change the startup registration", e);
      }
      // Report what Windows actually holds, not what was asked for.
      return current();
    },
  };
}
