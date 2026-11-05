import { useCallback, useState } from "react";
import { Linking } from "react-native";
import { ApiError, call, connection } from "./api";
import type { Allowance } from "./types";
import { useSession } from "../state/SessionContext";

interface ClaimResponse {
  ticketPath: string;
  repeat: boolean;
  allowance: Allowance;
}

export interface ClaimFeedback {
  workId: number;
  kind: "ok" | "error";
  text: string;
}

/** Claim a one-page bibliographic card; the server enforces and records the allowance. */
export function useClaimCard() {
  const { setAllowance, refreshAllowance } = useSession();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<ClaimFeedback | null>(null);

  const claim = useCallback(
    async (workId: number) => {
      setPendingId(workId);
      setFeedback(null);
      try {
        const res = await call<ClaimResponse>(`/loans/${workId}/claim`, { method: "POST" });
        setAllowance(res.allowance);
        await Linking.openURL(`${connection.base}${res.ticketPath}`);
        setFeedback({
          workId,
          kind: "ok",
          text: res.repeat ? "Downloaded again (free)." : `Card claimed. ${res.allowance.remaining} left.`
        });
      } catch (err) {
        if (err instanceof ApiError && err.code === "ALLOWANCE_EXHAUSTED") void refreshAllowance();
        setFeedback({ workId, kind: "error", text: err instanceof Error ? err.message : "Could not claim the card." });
      } finally {
        setPendingId(null);
      }
    },
    [setAllowance, refreshAllowance]
  );

  return { claim, pendingId, feedback };
}
