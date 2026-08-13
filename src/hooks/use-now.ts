import { useEffect, useState } from "react";

/**
 * A clock that ticks on the client only.
 *
 * Returns `null` until mounted so server and client render the same markup —
 * anything time-derived should render a placeholder while this is null.
 */
export function useNow(intervalMs = 30_000): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
