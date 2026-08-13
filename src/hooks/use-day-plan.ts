import { useCallback, useEffect, useState } from "react";

import { dayKey } from "@/data/daily";
import { createDefaultPlan, type DayPlan } from "@/data/plan";
import { KEYS, readJson, writeJson } from "@/services/store";

type PlanStore = Record<string, DayPlan>;

/**
 * Plans keyed by local calendar day, so today's tasks are genuinely today's —
 * tomorrow starts from whatever you planned the night before, or a fresh default.
 */
export function useDayPlan(today: string | null) {
  const [store, setStore] = useState<PlanStore>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void readJson<PlanStore>(KEYS.dayPlans, {}).then((saved) => {
      if (cancelled) return;
      setStore(saved);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void writeJson(KEYS.dayPlans, store);
  }, [store, hydrated]);

  const planFor = useCallback((key: string): DayPlan => store[key] ?? createDefaultPlan(), [store]);

  const savePlan = useCallback((key: string, plan: DayPlan) => {
    setStore((prev) => ({ ...prev, [key]: plan }));
  }, []);

  const updatePlan = useCallback((key: string, updater: (plan: DayPlan) => DayPlan) => {
    setStore((prev) => ({ ...prev, [key]: updater(prev[key] ?? createDefaultPlan()) }));
  }, []);

  const todayPlan = hydrated && today ? planFor(today) : null;

  const updateToday = useCallback(
    (updater: (plan: DayPlan) => DayPlan) => {
      if (!today) return;
      updatePlan(today, updater);
    },
    [today, updatePlan],
  );

  /** Whether a plan was explicitly saved for that day (vs. falling back to defaults). */
  const hasPlan = useCallback((key: string) => Boolean(store[key]), [store]);

  return {
    hydrated,
    todayPlan,
    /** Every saved plan, keyed by day — the Calendar derives commitments from this. */
    plans: store,
    planFor,
    savePlan,
    updatePlan,
    updateToday,
    hasPlan,
  };
}

export function tomorrowKey(now: Date): string {
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return dayKey(t);
}
