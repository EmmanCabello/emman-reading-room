import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "../features/auth/SessionProvider";
import { call } from "../lib/api";
import type { LibrarianTurn, Proposal, ShelfSnapshot, TraceStep } from "../lib/types";
import { useUserShelf } from "./useUserShelf";

export interface BotMessage {
  id: number;
  role: "reader" | "curator";
  text: string;
  trace?: TraceStep[];
  proposals?: Array<Proposal & { state: "pending" | "confirmed" | "dismissed" | "failed" }>;
}

interface Status {
  persona: string;
  greeting: string;
  mode: "online" | "offline";
}

export function useLibrarianBot() {
  const { patron } = useSession();
  const { replace } = useUserShelf();
  const [status, setStatus] = useState<Status | null>(null);
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const focus = useRef<number[]>([]);
  const nextId = useRef(1);

  useEffect(() => {
    call<Status>("/librarian/status")
      .then((s) => {
        setStatus(s);
        setMessages((m) => (m.length ? m : [{ id: nextId.current++, role: "curator", text: s.greeting }]));
      })
      .catch(() => setStatus(null));
  }, []);

  const ask = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      const history = messages
        .filter((m) => m.text)
        .slice(-10)
        .map((m) => ({ role: m.role === "reader" ? ("user" as const) : ("assistant" as const), content: m.text }));
      setMessages((m) => [...m, { id: nextId.current++, role: "reader", text: trimmed }]);
      setBusy(true);
      try {
        const turn = await call<LibrarianTurn>("/librarian/chat", {
          method: "POST",
          body: { message: trimmed, history, focusIds: focus.current }
        });
        focus.current = turn.focusIds;
        setMessages((m) => [
          ...m,
          {
            id: nextId.current++,
            role: "curator",
            text: turn.notice ? `${turn.reply}\n\n(${turn.notice})` : turn.reply,
            trace: turn.trace,
            proposals: turn.proposals.map((p) => ({ ...p, state: "pending" as const }))
          }
        ]);
      } catch (err) {
        setMessages((m) => [
          ...m,
          { id: nextId.current++, role: "curator", text: err instanceof Error ? err.message : "The curator could not be reached." }
        ]);
      } finally {
        setBusy(false);
      }
    },
    [busy, messages]
  );

  const setProposalState = (proposalId: string, state: "confirmed" | "dismissed" | "failed") =>
    setMessages((all) =>
      all.map((m) => ({
        ...m,
        proposals: m.proposals?.map((p) => (p.id === proposalId ? { ...p, state } : p))
      }))
    );

  /** Step two of the two-step flow: POST /api/librarian/confirm is the only write. */
  const confirm = useCallback(
    async (proposalId: string) => {
      try {
        const outcome = await call<{ shelf: ShelfSnapshot }>("/librarian/confirm", {
          method: "POST",
          body: { proposalId }
        });
        replace(outcome.shelf);
        setProposalState(proposalId, "confirmed");
      } catch {
        setProposalState(proposalId, "failed");
      }
    },
    [replace]
  );

  const dismiss = useCallback(async (proposalId: string) => {
    try {
      await call("/librarian/dismiss", { method: "POST", body: { proposalId } });
      setProposalState(proposalId, "dismissed");
    } catch {
      setProposalState(proposalId, "failed");
    }
  }, []);

  return { status, messages, busy, ask, confirm, dismiss, signedIn: !!patron };
}
