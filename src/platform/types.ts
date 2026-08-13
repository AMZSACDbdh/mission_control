/**
 * The platform contract.
 *
 * Everything the application needs from the machine it happens to be running on
 * is declared here, and nowhere else. The browser is *one* implementation of
 * this contract; a Tauri desktop build will later be another. Application code
 * imports from `@/platform` and never touches `localStorage`, `Notification`,
 * `navigator` or `document` directly.
 *
 * Two rules keep this useful rather than ceremonial:
 *
 *  1. **Everything is async.** localStorage is synchronous, but every storage
 *     API a desktop build would use — Tauri's store plugin, the filesystem,
 *     SQLite — is not. A synchronous contract would be a dead end that had to be
 *     unpicked later, so the cost is paid once, now, while the app is small.
 *
 *  2. **Capabilities are data, not prose.** What the platform can and cannot do
 *     is declared in `PlatformCapabilities` so the UI can ask, rather than
 *     hardcoding "a web page cannot do this". When the desktop build arrives,
 *     those honest limits stop being true and the interface corrects itself
 *     instead of lying in the opposite direction.
 */

/* ------------------------------------------------------------------ *
 * Storage
 * ------------------------------------------------------------------ */

export type WriteResult =
  { ok: true } | { ok: false; reason: "quota" | "unavailable" | "unknown"; message: string };

export type StorageUsage = {
  bytes: number;
  quota: number;
  percent: number;
  /** Past this, warn — there is still time to act. */
  nearingLimit: boolean;
  critical: boolean;
};

export interface StorageAdapter {
  read(key: string): Promise<string | null>;

  /**
   * Writes, and reports whether it actually worked.
   *
   * A write that fails silently is the worst failure this app can have: memory
   * stays correct, the UI updates, and the loss is discovered on next launch.
   * Every implementation must tell the truth here.
   */
  write(key: string, value: string): Promise<WriteResult>;

  remove(key: string): Promise<void>;

  /** Keys this app owns, optionally filtered by prefix. */
  keys(prefix?: string): Promise<string[]>;

  /**
   * Approximate consumption, or `null` when the platform has no meaningful
   * quota. Returning `null` is the correct answer for a desktop filesystem —
   * the storage warning should disappear there rather than invent a limit.
   */
  usage(prefix?: string): Promise<StorageUsage | null>;
}

/* ------------------------------------------------------------------ *
 * Notifications
 * ------------------------------------------------------------------ */

export type NotificationPermission = "granted" | "denied" | "default" | "unsupported";

export interface NotificationAdapter {
  permission(): NotificationPermission;
  /** Asks the user. Resolves to whether permission is now granted. */
  request(): Promise<boolean>;
  show(title: string, options?: { body?: string; tag?: string }): Promise<void>;
}

/* ------------------------------------------------------------------ *
 * Location
 * ------------------------------------------------------------------ */

export type Coordinates = { latitude: number; longitude: number };

export interface GeolocationAdapter {
  /** Resolves to `null` when unavailable or declined — never throws. */
  current(timeoutMs?: number): Promise<Coordinates | null>;
}

/* ------------------------------------------------------------------ *
 * Presence
 * ------------------------------------------------------------------ */

/**
 * How much of the user's attention this platform can actually observe.
 *
 * `tab` — only that this browser tab was hidden. Cannot tell a different tab
 *   from a different application, and cannot see the phone in your hand.
 * `window` — the app window lost focus.
 * `system` — the foreground application is known.
 *
 * The Focus page uses this to describe what it measured without overstating it.
 */
export type PresenceFidelity = "tab" | "window" | "system";

export interface PresenceAdapter {
  readonly fidelity: PresenceFidelity;
  isPresent(): boolean;
  /** Subscribes to attention changes. Returns an unsubscribe function. */
  subscribe(listener: (present: boolean) => void): () => void;
}

/* ------------------------------------------------------------------ *
 * Files
 * ------------------------------------------------------------------ */

export interface FileAdapter {
  /** Writes text out to wherever the platform puts user-visible files. */
  saveText(suggestedName: string, contents: string, mimeType?: string): Promise<void>;
}

/* ------------------------------------------------------------------ *
 * Startup
 * ------------------------------------------------------------------ */

/**
 * Registration for launching when the user signs in.
 *
 * Both methods report the state actually in effect rather than the state that
 * was requested, and neither throws. A machine that refuses the registration —
 * locked-down registry, group policy, a security product — is one where the
 * toggle should fall back and say so, not one where Settings crashes.
 *
 * Launching at startup is a convenience. It must never be able to take the
 * ledger down with it, so nothing here shares a failure path with storage.
 */
export interface StartupAdapter {
  /** Whether the app is currently registered to launch at sign-in. */
  isEnabled(): Promise<boolean>;
  /** Requests a change. Resolves to the state in effect afterwards. */
  setEnabled(enabled: boolean): Promise<boolean>;
}

/* ------------------------------------------------------------------ *
 * Capabilities
 * ------------------------------------------------------------------ */

/**
 * What this platform can actually do.
 *
 * Features ask these questions instead of asking "am I in a browser?", so a
 * capability arriving on the desktop build lights up the feature without the
 * feature knowing why. Every flag below is `false` on the web today; the Tauri
 * build is expected to turn most of them on.
 *
 * A flag exists here before its adapter does — that is intentional. It lets the
 * interface say "this needs the desktop app" honestly today, rather than
 * offering a button that quietly does nothing.
 */
export type PlatformCapabilities = {
  readonly name: "web" | "tauri";
  /** Storage is bounded by a browser quota and can be cleared by the user. */
  readonly storageIsQuotaLimited: boolean;
  /** Can raise a notification while the app window is closed. */
  readonly canNotifyInBackground: boolean;
  /** Can prevent access to other applications or websites. */
  readonly canBlockDistractions: boolean;
  /** Can observe which application is in the foreground. */
  readonly canObserveSystemPresence: boolean;
  /** Can start itself when Windows starts. */
  readonly canAutostart: boolean;
  /** Keeps running with no window on screen. */
  readonly canRunInBackground: boolean;
  /** Can live in the system tray. */
  readonly canUseSystemTray: boolean;
  /** Can run a timer or fire a reminder while closed. */
  readonly canScheduleInBackground: boolean;
  /** Can bind shortcuts that work outside the app. */
  readonly canUseGlobalShortcuts: boolean;
};

export interface Platform {
  readonly capabilities: PlatformCapabilities;
  readonly storage: StorageAdapter;
  readonly notifications: NotificationAdapter;
  readonly geolocation: GeolocationAdapter;
  readonly presence: PresenceAdapter;
  readonly files: FileAdapter;
  readonly startup: StartupAdapter;
}
