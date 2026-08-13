import { useEffect, useState } from "react";

import type { Mission } from "@/data/missionsData";
import { KEYS, readJson } from "@/services/store";

/**
 * Read-only access to the missions store.
 *
 * The Missions page owns writes; this exists so other pages (the Calendar) can
 * derive from mission due dates without a second copy of the data. Read-only by
 * design — two writers to one store is the failure this codebase keeps removing.
 */
export function useMissionsRead(): { missions: Mission[]; hydrated: boolean } {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void readJson<Mission[]>(KEYS.missions, []).then((saved) => {
      if (cancelled) return;
      setMissions(saved);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { missions, hydrated };
}
