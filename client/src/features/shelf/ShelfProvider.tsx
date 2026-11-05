import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSession } from "../auth/SessionProvider";
import { call } from "../../lib/api";
import type { ShelfSnapshot, Stage } from "../../lib/types";

const EMPTY: ShelfSnapshot = { entries: [], pins: [], revision: "0" };

export interface ShelfValue {
  shelf: ShelfSnapshot;
  loading: boolean;
  stageOf: (workId: number) => Stage | null;
  keep: (workId: number, stage: Stage) => Promise<void>;
  drop: (workId: number) => Promise<void>;
  pin: (workId: number, locator: string) => Promise<void>;
  unpin: (pinId: string) => Promise<void>;
  replace: (next: ShelfSnapshot) => void;
  reload: () => Promise<void>;
}

export const ShelfContext = createContext<ShelfValue | null>(null);

/** One shelf for the whole app; the same snapshot the phone app reads from the API. */
export function ShelfProvider({ children }: { children: ReactNode }) {
  const { patron } = useSession();
  const [shelf, setShelf] = useState<ShelfSnapshot>(EMPTY);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!patron) {
      setShelf(EMPTY);
      return;
    }
    setLoading(true);
    try {
      setShelf(await call<ShelfSnapshot>("/shelves"));
    } finally {
      setLoading(false);
    }
  }, [patron]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Pick up changes made on the phone whenever the tab regains focus.
  useEffect(() => {
    const onFocus = () => void reload();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [reload]);

  const value = useMemo<ShelfValue>(
    () => ({
      shelf,
      loading,
      stageOf: (workId) => shelf.entries.find((e) => e.workId === workId)?.stage ?? null,
      keep: async (workId, stage) => setShelf(await call<ShelfSnapshot>(`/shelves/${workId}`, { method: "PUT", body: { stage } })),
      drop: async (workId) => setShelf(await call<ShelfSnapshot>(`/shelves/${workId}`, { method: "DELETE" })),
      pin: async (workId, locator) =>
        setShelf(await call<ShelfSnapshot>(`/shelves/${workId}/pins`, { method: "POST", body: { locator } })),
      unpin: async (pinId) => setShelf(await call<ShelfSnapshot>(`/shelves/pins/${pinId}`, { method: "DELETE" })),
      replace: setShelf,
      reload
    }),
    [shelf, loading, reload]
  );

  return <ShelfContext.Provider value={value}>{children}</ShelfContext.Provider>;
}
