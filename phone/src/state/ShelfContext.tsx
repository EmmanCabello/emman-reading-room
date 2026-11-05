import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { call } from "../lib/api";
import type { ShelfSnapshot, Stage } from "../lib/types";
import { useSession } from "./SessionContext";

const EMPTY: ShelfSnapshot = { entries: [], pins: [], revision: "0" };

interface ShelfValue {
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

const Ctx = createContext<ShelfValue | null>(null);

/** Same API snapshot as the web app, so shelf and bookmarks stay in sync. */
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
    } catch {
      /* keep the last known shelf */
    } finally {
      setLoading(false);
    }
  }, [patron]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo<ShelfValue>(
    () => ({
      shelf,
      loading,
      stageOf: (id) => shelf.entries.find((e) => e.workId === id)?.stage ?? null,
      keep: async (id, stage) => setShelf(await call<ShelfSnapshot>(`/shelves/${id}`, { method: "PUT", body: { stage } })),
      drop: async (id) => setShelf(await call<ShelfSnapshot>(`/shelves/${id}`, { method: "DELETE" })),
      pin: async (id, locator) =>
        setShelf(await call<ShelfSnapshot>(`/shelves/${id}/pins`, { method: "POST", body: { locator } })),
      unpin: async (pinId) => setShelf(await call<ShelfSnapshot>(`/shelves/pins/${pinId}`, { method: "DELETE" })),
      replace: setShelf,
      reload
    }),
    [shelf, loading, reload]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShelf(): ShelfValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useShelf must be used inside ShelfProvider");
  return ctx;
}
