import jwt from "jsonwebtoken";
import { env } from "../config/env";

interface SessionClaims {
  sub: string;
  kind: "session";
}

interface TicketClaims {
  work: number;
  holder: string;
  kind: "card-ticket";
}

const SESSION_TTL = "14d";
const TICKET_TTL_SECONDS = 300;

export function issueSessionToken(patronId: string): string {
  const claims: SessionClaims = { sub: patronId, kind: "session" };
  return jwt.sign(claims, env.jwtSecret, { expiresIn: SESSION_TTL });
}

export function readSessionToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as Partial<SessionClaims>;
    return decoded.kind === "session" && typeof decoded.sub === "string" ? decoded.sub : null;
  } catch {
    return null;
  }
}

/** Short-lived, single-purpose ticket that lets a browser or phone fetch a claimed card PDF. */
export function issueCardTicket(workId: number, holder: string): string {
  const claims: TicketClaims = { work: workId, holder, kind: "card-ticket" };
  return jwt.sign(claims, env.jwtSecret, { expiresIn: TICKET_TTL_SECONDS });
}

export function readCardTicket(ticket: string): { workId: number; holder: string } | null {
  try {
    const decoded = jwt.verify(ticket, env.jwtSecret) as Partial<TicketClaims>;
    return decoded.kind === "card-ticket" && typeof decoded.work === "number"
      ? { workId: decoded.work, holder: decoded.holder ?? "a guest reader" }
      : null;
  } catch {
    return null;
  }
}
