import { useEffect, useState } from "react";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  type LucideIcon,
} from "lucide-react";

import { platform } from "@/platform";

/**
 * Live local weather.
 *
 * Location comes from `platform.geolocation`; if the user declines (or it
 * fails) we fall back to a default city and flag the reading as approximate.
 * Weather itself comes from Open-Meteo, which needs no API key or signup.
 */

export type WeatherState = {
  status: "loading" | "ready" | "error";
  temperatureC: number | null;
  condition: string;
  city: string;
  icon: LucideIcon;
  /** True when we could not get real coordinates and used the fallback city. */
  approximate: boolean;
};

const FALLBACK = { latitude: 28.6139, longitude: 77.209, city: "New Delhi" };

/** WMO weather interpretation codes used by Open-Meteo. */
const wmo: Record<number, { label: string; icon: LucideIcon }> = {
  0: { label: "Clear Sky", icon: Sun },
  1: { label: "Mainly Clear", icon: Sun },
  2: { label: "Partly Cloudy", icon: CloudSun },
  3: { label: "Overcast", icon: Cloud },
  45: { label: "Fog", icon: CloudFog },
  48: { label: "Rime Fog", icon: CloudFog },
  51: { label: "Light Drizzle", icon: CloudDrizzle },
  53: { label: "Drizzle", icon: CloudDrizzle },
  55: { label: "Heavy Drizzle", icon: CloudDrizzle },
  56: { label: "Freezing Drizzle", icon: CloudDrizzle },
  57: { label: "Freezing Drizzle", icon: CloudDrizzle },
  61: { label: "Light Rain", icon: CloudRain },
  63: { label: "Rain", icon: CloudRain },
  65: { label: "Heavy Rain", icon: CloudRain },
  66: { label: "Freezing Rain", icon: CloudRain },
  67: { label: "Freezing Rain", icon: CloudRain },
  71: { label: "Light Snow", icon: CloudSnow },
  73: { label: "Snow", icon: CloudSnow },
  75: { label: "Heavy Snow", icon: CloudSnow },
  77: { label: "Snow Grains", icon: CloudSnow },
  80: { label: "Rain Showers", icon: CloudRain },
  81: { label: "Rain Showers", icon: CloudRain },
  82: { label: "Violent Showers", icon: CloudRain },
  85: { label: "Snow Showers", icon: CloudSnow },
  86: { label: "Snow Showers", icon: CloudSnow },
  95: { label: "Thunderstorm", icon: CloudLightning },
  96: { label: "Thunderstorm", icon: CloudLightning },
  99: { label: "Severe Storm", icon: CloudLightning },
};

/** Best-effort city label. Failure here is non-fatal — weather still shows. */
async function resolveCity(latitude: number, longitude: number, signal: AbortSignal) {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
      { signal },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.city || data.locality || data.principalSubdivision || null;
  } catch {
    return null;
  }
}

export function useWeather(): WeatherState {
  const [state, setState] = useState<WeatherState>({
    status: "loading",
    temperatureC: null,
    condition: "Reading the sky",
    city: "",
    icon: CloudSun,
    approximate: false,
  });

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      const located = await platform.geolocation.current();
      if (cancelled) return;

      const coords = located ?? FALLBACK;
      const approximate = located === null;

      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,weather_code&timezone=auto`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(`Open-Meteo responded ${res.status}`);
        const data = await res.json();
        if (cancelled) return;

        const code: number = data?.current?.weather_code ?? 0;
        const temp: number | null = data?.current?.temperature_2m ?? null;
        const mapped = wmo[code] ?? { label: "Unsettled", icon: CloudSun };

        const city =
          (approximate
            ? FALLBACK.city
            : await resolveCity(coords.latitude, coords.longitude, controller.signal)) ??
          FALLBACK.city;
        if (cancelled) return;

        setState({
          status: "ready",
          temperatureC: temp === null ? null : Math.round(temp),
          condition: mapped.label,
          city,
          icon: mapped.icon,
          approximate,
        });
      } catch {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          status: "error",
          condition: "Weather unavailable",
        }));
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return state;
}
