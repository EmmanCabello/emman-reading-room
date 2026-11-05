import { Router } from "express";
import { db } from "../data/client";
import { allowanceGuard, snapshotAllowance } from "../middleware/allowanceGuard";
import { getWork, presentWork } from "../services/catalogService";
import { renderBibliographicCard } from "../services/cardGenerator";
import { issueCardTicket, readCardTicket } from "../services/tokenService";
import { HttpError, notFound } from "./httpError";

export const loansRouter = Router();

/** How many distinct titles the caller (guest by IP, or signed-in reader) may still claim. */
loansRouter.get("/allowance", async (req, res) => {
  res.json({ allowance: await snapshotAllowance(req) });
});

/** Titles a signed-in reader has already claimed (these can be re-downloaded for free). */
loansRouter.get("/", async (req, res) => {
  if (!req.patron) {
    const rows = await db.guestRetrieval.findMany({
      where: { ip: req.visitorIp },
      include: { work: true },
      orderBy: { createdAt: "desc" }
    });
    return res.json({
      claimed: rows.map((r) => ({ claimedAt: r.createdAt.toISOString(), work: presentWork(r.work) })),
      allowance: await snapshotAllowance(req)
    });
  }
  const rows = await db.retrieval.findMany({
    where: { patronId: req.patron.id },
    include: { work: true },
    orderBy: { createdAt: "desc" }
  });
  res.json({
    claimed: rows.map((r) => ({ claimedAt: r.createdAt.toISOString(), work: presentWork(r.work) })),
    allowance: await snapshotAllowance(req)
  });
});

/**
 * Claim a bibliographic card. The allowance guard enforces and records the cap,
 * then a five-minute ticket URL is returned that web and phone can open directly.
 */
loansRouter.post("/:workId/claim", allowanceGuard, async (req, res) => {
  const state = req.allowance!;
  const ticket = issueCardTicket(state.workId, req.patron?.displayName ?? "a guest reader");
  const base = `${req.protocol}://${req.get("host")}`;
  res.json({
    ticketPath: `/api/loans/card/${ticket}`,
    ticketUrl: `${base}/api/loans/card/${ticket}`,
    repeat: state.repeat,
    allowance: {
      audience: state.audience,
      cap: state.cap,
      used: state.used,
      remaining: state.remaining
    }
  });
});

loansRouter.get("/card/:ticket", async (req, res) => {
  const claim = readCardTicket(String(req.params.ticket));
  if (!claim) throw new HttpError(401, "TICKET_INVALID", "This download link has expired. Claim the card again.");
  const work = await getWork(claim.workId);
  if (!work) throw notFound("That title");

  const pdf = await renderBibliographicCard(work, claim.holder);
  const safeName = work.slug.slice(0, 60);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="emman-card-${safeName}.pdf"`);
  res.setHeader("Content-Length", String(pdf.length));
  res.setHeader("Cache-Control", "private, no-store");
  res.end(pdf);
});
