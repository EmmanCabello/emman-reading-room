import { Router } from "express";
import { z } from "zod";
import { db } from "../data/client";
import { requireCurator } from "../middleware/authGuard";
import { createWork, deleteWork, presentWork, updateWork } from "../services/catalogService";
import { badRequest, notFound } from "./httpError";

export const adminRouter = Router();
adminRouter.use(requireCurator);

adminRouter.get("/overview", async (_req, res) => {
  const [works, patrons, shelfItems, pins, retrievals, guestRetrievals, pendingProposals] = await Promise.all([
    db.work.count(),
    db.patron.count(),
    db.shelfItem.count(),
    db.pin.count(),
    db.retrieval.count(),
    db.guestRetrieval.count(),
    db.proposal.count({ where: { state: "pending" } })
  ]);

  const popular = await db.retrieval.groupBy({
    by: ["workId"],
    _count: { _all: true },
    orderBy: { _count: { workId: "desc" } },
    take: 5
  });
  const popularWorks = await db.work.findMany({ where: { id: { in: popular.map((p) => p.workId) } } });
  const recent = await db.retrieval.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
    include: { work: true, patron: { select: { email: true, displayName: true } } }
  });
  const guests = await db.guestRetrieval.groupBy({
    by: ["ip"],
    _count: { _all: true },
    orderBy: { _count: { ip: "desc" } },
    take: 8
  });

  res.json({
    totals: { works, patrons, shelfItems, pins, retrievals, guestRetrievals, pendingProposals },
    popular: popular.map((p) => ({
      claims: p._count._all,
      work: presentWork(popularWorks.find((w) => w.id === p.workId)!)
    })),
    recent: recent.map((r) => ({
      claimedAt: r.createdAt.toISOString(),
      patron: r.patron.displayName,
      email: r.patron.email,
      work: presentWork(r.work)
    })),
    guests: guests.map((g) => ({ ip: g.ip, claims: g._count._all }))
  });
});

adminRouter.get("/patrons", async (_req, res) => {
  const patrons = await db.patron.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { retrievals: true, shelfItems: true, pins: true } } }
  });
  res.json({
    patrons: patrons.map((p) => ({
      id: p.id,
      email: p.email,
      displayName: p.displayName,
      role: p.role,
      createdAt: p.createdAt.toISOString(),
      claimed: p._count.retrievals,
      shelved: p._count.shelfItems,
      pins: p._count.pins
    }))
  });
});

/** Reset a reader's claimed-title counter. */
adminRouter.delete("/patrons/:patronId/claims", async (req, res) => {
  const result = await db.retrieval.deleteMany({ where: { patronId: String(req.params.patronId) } });
  res.json({ cleared: result.count });
});

/** Reset a guest IP's claimed-title counter. */
adminRouter.delete("/guests/:ip/claims", async (req, res) => {
  const result = await db.guestRetrieval.deleteMany({ where: { ip: decodeURIComponent(String(req.params.ip)) } });
  res.json({ cleared: result.count });
});

const workBody = z.object({
  title: z.string().trim().min(1).max(200),
  author: z.string().trim().min(1).max(120),
  authorLife: z.string().trim().max(60).optional(),
  year: z.coerce.number().int().min(-3000).max(2100),
  summary: z.string().trim().min(1).max(600),
  roomKey: z.string().trim().min(1).max(40),
  roomLabel: z.string().trim().min(1).max(60),
  gutenbergId: z.coerce.number().int().positive().nullable().optional()
});

adminRouter.post("/works", async (req, res) => {
  res.status(201).json({ work: await createWork(workBody.parse(req.body)) });
});

adminRouter.patch("/works/:workId", async (req, res) => {
  const id = Number(req.params.workId);
  if (!Number.isInteger(id)) throw badRequest("Invalid title id.");
  const work = await updateWork(id, workBody.partial().parse(req.body));
  if (!work) throw notFound("That title");
  res.json({ work });
});

adminRouter.delete("/works/:workId", async (req, res) => {
  const id = Number(req.params.workId);
  if (!Number.isInteger(id)) throw badRequest("Invalid title id.");
  if (!(await deleteWork(id))) throw notFound("That title");
  res.status(204).end();
});
