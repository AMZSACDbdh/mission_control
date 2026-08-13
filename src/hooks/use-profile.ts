import { useCallback, useEffect, useState } from "react";

import { DEFAULT_NAME, getName, NAME_EVENT, setName as persistName } from "@/lib/profile";

/**
 * The user's name, read on mount so server and client render the same markup.
 *
 * Starts at the default rather than reading storage during render — there is no
 * storage on the server, and a name that appears only after hydration is
 * preferable to markup that does not match.
 */
export function useProfileName(): [string, (next: string) => void] {
  const [name, setNameState] = useState(DEFAULT_NAME);

  useEffect(() => {
    let cancelled = false;
    const sync = () => {
      void getName().then((value) => {
        if (!cancelled) setNameState(value);
      });
    };
    sync();
    // `storage` covers other tabs; the custom event covers this one.
    window.addEventListener("storage", sync);
    window.addEventListener(NAME_EVENT, sync);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", sync);
      window.removeEventListener(NAME_EVENT, sync);
    };
  }, []);

  const update = useCallback((next: string) => {
    // Optimistic: the input should not wait on a disk write to feel responsive.
    setNameState(next.trim() || DEFAULT_NAME);
    void persistName(next);
  }, []);

  return [name, update];
}
