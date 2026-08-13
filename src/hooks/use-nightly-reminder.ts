import { useEffect, useState } from "react";

import { platform } from "@/platform";

/** The hour (local, 24h) after which the app starts asking you to plan tomorrow. */
export const PLAN_HOUR = 21;

/**
 * Raises one notification per night, once the planning hour arrives.
 *
 * On the web this only fires while the app is actually open — a web page cannot
 * wake a closed laptop, which is why the in-app planner remains the reliable
 * path. A platform reporting `canNotifyInBackground` would lift that limit
 * without this hook changing.
 */
export function useNightlyReminder(now: Date | null, enabled: boolean, tomorrowLabel: string) {
  const [firedFor, setFiredFor] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !now) return;
    if (platform.notifications.permission() !== "granted") return;
    if (now.getHours() < PLAN_HOUR) return;

    const key = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    if (firedFor === key) return;

    setFiredFor(key);
    void platform.notifications.show("Mission Control", {
      body: `Plan tomorrow — set your three tasks for ${tomorrowLabel}.`,
      tag: "mission-control-nightly-plan",
    });
  }, [now, enabled, firedFor, tomorrowLabel]);
}
