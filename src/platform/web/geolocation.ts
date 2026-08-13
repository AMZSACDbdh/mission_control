import type { Coordinates, GeolocationAdapter } from "../types";

/**
 * Coordinates from the browser's geolocation API.
 *
 * Resolves to `null` rather than throwing when unavailable or declined — the
 * caller falls back to an approximate city and says so. Location is never
 * displayed; it exists only to fetch the local weather.
 */
export function createWebGeolocation(): GeolocationAdapter {
  return {
    current(timeoutMs = 8000): Promise<Coordinates | null> {
      return new Promise((resolve) => {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          () => resolve(null),
          { timeout: timeoutMs, maximumAge: 15 * 60 * 1000 },
        );
      });
    },
  };
}
