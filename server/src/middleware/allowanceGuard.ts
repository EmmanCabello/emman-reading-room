import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { db } from "../data/client";
import { HttpError, notFound } from "../http/httpError";

export interface AllowanceState {
  audience: "guest" | "reader";
  cap: number;
  used: number;
  remaining: number;
  /** True when the title was already claimed earlier, so nothing new was counted. */
  repeat: boolean;
  workId: number;
}

export interface AllowanceSnapshot {
  audience: "guest" | "reader";
  cap: number;
  used: number;
  remaining: number;
}

export async function snapshotAllowance(req: Request): Promise<AllowanceSnapshot> {
  if (req.patron) {
    const used = await db.retrieval.count({ where: { patronId: req.patron.id } });
    const cap = env.limits.readerDistinctTitles;
    return { audience: "reader", cap, used, remaining: Math.max(0, cap - used) };
  }
  const used = await db.guestRetrieval.count({ where: { ip: req.visitorIp } });
  const cap = env.limits.guestDistinctTitles;
  return { audience: "guest", cap, used, remaining: Math.max(0, cap - used) };
}

class CapReached extends Error {}

/**
 * Enforces and records the distinct-title download allowance for `:workId`.
 * - Guests: 5 distinct titles per IP address.
 * - Signed-in readers: 10 distinct titles stored per account.
 * Re-claiming a title that was already claimed never counts against the cap.
 */
export async function allowanceGuard(req: Request, _res: Response, next: NextFunction) {
  const workId = Number(req.params.workId);
  if (!Number.isInteger(workId)) throw notFound("That title");
  const work = await db.work.findUnique({ where: { id: workId }, select: { id: true } });
  if (!work) throw notFound("That title");

  const audience = req.patron ? "reader" : "guest";
  const cap = req.patron ? env.limits.readerDistinctTitles : env.limits.guestDistinctTitles;

  try {
    const outcome = await db.$transaction(async (tx) => {
      if (req.patron) {
        const patronId = req.patron.id;
        const prior = await tx.retrieval.findUnique({
          where: { patronId_workId: { patronId, workId } }
        });
        const used = await tx.retrieval.count({ where: { patronId } });
        if (prior) return { repeat: true, used };
        if (used >= cap) throw new CapReached();
        await tx.retrieval.create({ data: { patronId, workId } });
        return { repeat: false, used: used + 1 };
      }
      const ip = req.visitorIp;
      const prior = await tx.guestRetrieval.findUnique({ where: { ip_workId: { ip, workId } } });
      const used = await tx.guestRetrieval.count({ where: { ip } });
      if (prior) return { repeat: true, used };
      if (used >= cap) throw new CapReached();
      await tx.guestRetrieval.create({ data: { ip, workId } });
      return { repeat: false, used: used + 1 };
    });

    req.allowance = {
      audience,
      cap,
      used: outcome.used,
      remaining: Math.max(0, cap - outcome.used),
      repeat: outcome.repeat,
      workId
    };
    next();
  } catch (err) {
    if (err instanceof CapReached) {
      throw new HttpError(
        403,
        "ALLOWANCE_EXHAUSTED",
        audience === "guest"
          ? `Guests may claim ${cap} different titles. Sign in to claim up to ${env.limits.readerDistinctTitles}.`
          : `Your allowance of ${cap} different titles has been reached. Titles you already claimed can be downloaded again.`,
        { audience, cap, used: cap, remaining: 0 }
      );
    }
    throw err;
  }
}
