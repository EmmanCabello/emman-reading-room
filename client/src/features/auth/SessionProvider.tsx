import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { call, sessionStore } from "../../lib/api";
import type { Allowance, Patron } from "../../lib/types";

interface SessionValue {
  patron: Patron | null;
  ready: boolean;
  allowance: Allowance | null;
  signIn: (email: string, password: string) => Promise<Patron>;
  register: (displayName: string, email: string, password: string) => Promise<Patron>;
  signOut: () => void;
  refreshAllowance: () => Promise<void>;
  setAllowance: (next: Allowance) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

interface AuthPayload {
  token: string;
  patron: Patron;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [patron, setPatron] = useState<Patron | null>(null);
  const [ready, setReady] = useState(false);
  const [allowance, setAllowance] = useState<Allowance | null>(null);

  const refreshAllowance = useCallback(async () => {
    try {
      const result = await call<{ allowance: Allowance }>("/loans/allowance");
      setAllowance(result.allowance);
    } catch {
      setAllowance(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (sessionStore.read()) {
        try {
          const me = await call<{ patron: Patron }>("/session/me");
          if (!cancelled) setPatron(me.patron);
        } catch {
          sessionStore.clear();
        }
      }
      await refreshAllowance();
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshAllowance]);

  const finishAuth = useCallback(
    async (payload: AuthPayload) => {
      sessionStore.write(payload.token);
      setPatron(payload.patron);
      await refreshAllowance();
      return payload.patron;
    },
    [refreshAllowance]
  );

  const value = useMemo<SessionValue>(
    () => ({
      patron,
      ready,
      allowance,
      signIn: async (email, password) =>
        finishAuth(await call<AuthPayload>("/session/login", { method: "POST", body: { email, password } })),
      register: async (displayName, email, password) =>
        finishAuth(
          await call<AuthPayload>("/session/register", { method: "POST", body: { displayName, email, password } })
        ),
      signOut: () => {
        sessionStore.clear();
        setPatron(null);
        void refreshAllowance();
      },
      refreshAllowance,
      setAllowance
    }),
    [patron, ready, allowance, finishAuth, refreshAllowance]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
