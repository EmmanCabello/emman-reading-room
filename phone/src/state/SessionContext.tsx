import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { call, connection } from "../lib/api";
import type { Allowance, Patron } from "../lib/types";

interface SessionValue {
  patron: Patron | null;
  ready: boolean;
  allowance: Allowance | null;
  apiBase: string;
  signIn: (email: string, password: string) => Promise<void>;
  register: (displayName: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setApiBase: (value: string) => Promise<void>;
  refreshAllowance: () => Promise<void>;
  setAllowance: (a: Allowance) => void;
}

const Ctx = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [patron, setPatron] = useState<Patron | null>(null);
  const [ready, setReady] = useState(false);
  const [allowance, setAllowance] = useState<Allowance | null>(null);
  const [apiBase, setBase] = useState(connection.base);

  const refreshAllowance = useCallback(async () => {
    try {
      setAllowance((await call<{ allowance: Allowance }>("/loans/allowance")).allowance);
    } catch {
      setAllowance(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const saved = await connection.load();
      setBase(saved.apiBase);
      if (saved.token) {
        try {
          setPatron((await call<{ patron: Patron }>("/session/me")).patron);
        } catch {
          await connection.setToken(null);
        }
      }
      await refreshAllowance();
      setReady(true);
    })();
  }, [refreshAllowance]);

  const value = useMemo<SessionValue>(
    () => ({
      patron,
      ready,
      allowance,
      apiBase,
      async signIn(email, password) {
        const res = await call<{ token: string; patron: Patron }>("/session/login", {
          method: "POST",
          body: { email, password }
        });
        await connection.setToken(res.token);
        setPatron(res.patron);
        await refreshAllowance();
      },
      async register(displayName, email, password) {
        const res = await call<{ token: string; patron: Patron }>("/auth/register", {
          method: "POST",
          body: { displayName, email, password }
        });
        await connection.setToken(res.token);
        setPatron(res.patron);
        await refreshAllowance();
      },
      async signOut() {
        await connection.setToken(null);
        setPatron(null);
        await refreshAllowance();
      },
      async setApiBase(next) {
        await connection.setBase(next);
        setBase(connection.base);
        await refreshAllowance();
      },
      refreshAllowance,
      setAllowance
    }),
    [patron, ready, allowance, apiBase, refreshAllowance]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
