import { useCallback, useEffect, useRef, useState } from "react";
import { call } from "./api";
import type { LibrarianTurn, Proposal, ShelfSnapshot, TraceStep } from "./types";
import { useSession } from "../state/SessionContext";
import { useShelf } from "../state/ShelfContext";

export interface ChatLine {
  id: number;
  role: "reader" | "curator";
  text: string;
  trace?: TraceStep[];
  proposals?: Array<Proposal & { state: "pending" | "confirmed" | "dismissed" | "failed" }>;
}

interface Status {
  greeting: string;
  mode: "online" | "offline";
}

export function useCuratorChat() {
  const { patron, apiBase } = useSession();
  const { replace } = useShelf();
  const [status, setStatus] = useState<Status | null>(null);
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [busy, setBusy] = useState(false);
  const focus = useRef<number[]>([]);
  const nextId = useRef(1);

  useEffect(() => {
    call<Status>("/librarian/status")
      .then((s) => {
        setStatus(s);
        setLines((l) => (l.length ? l : [{ id: nextId.current++, role: "curator", text: s.greeting }]));
      })
      .catch(() => setStatus(null));
  }, [apiBase]);

  const ask = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      const history = lines
        .slice(-10)
        .map((l) => ({ role: l.role === "reader" ? ("user" as const) : ("assistant" as const), content: l.text }));
      setLines((l) => [...l, { id: nextId.current++, role: "reader", text: trimmed }]);
      setBusy(true);
      try {
        const turn = await call<LibrarianTurn>("/librarian/chat", {
          method: "POST",
          body: { message: trimmed, history, focusIds: focus.current }
        });
        focus.current = turn.focusIds;
        setLines((l) => [
          ...l,
          {
            id: nextId.current++,
            role: "curator",
            text: turn.notice ? `${turn.reply}\n\n(${turn.notice})` : turn.reply,
            trace: turn.trace,
            proposals: turn.proposals.map((p) => ({ ...p, state: "pending" as const }))
          }
        ]);
      } catch (err) {
        setLines((l) => [
          ...l,
          { id: nextId.current++, role: "curator", text: err instanceof Error ? err.message : "The curator is unreachable." }
        ]);
      } finally {
        setBusy(false);
      }
    },
    [busy, lines]
  );

  const mark = (proposalId: string, state: "confirmed" | "dismissed" | "failed") =>
    setLines((all) =>
      all.map((l) => ({ ...l, proposals: l.proposals?.map((p) => (p.id === proposalId ? { ...p, state } : p)) }))
    );

  /** Two-step flow: POST /api/librarian/confirm is the only call that writes to the shelf. */
  const confirm = useCallback(
    async (proposalId: string) => {
      try {
        const out = await call<{ shelf: ShelfSnapshot }>("/librarian/confirm", { method: "POST", body: { proposalId } });
        replace(out.shelf);
        mark(proposalId, "confirmed");
      } catch {
        mark(proposalId, "failed");
      }
    },
    [replace]
  );

  const dismiss = useCallback(async (proposalId: string) => {
    try {
      await call("/librarian/dismiss", { method: "POST", body: { proposalId } });
      mark(proposalId, "dismissed");
    } catch {
      mark(proposalId, "failed");
    }
  }, []);

  return { status, lines, busy, ask, confirm, dismiss, signedIn: !!patron };
}
