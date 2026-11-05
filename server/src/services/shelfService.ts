import { db } from "../data/client";
import { HttpError, notFound } from "../http/httpError";
import { presentWork, type PublicWork } from "./catalogService";

export const SHELF_STAGES = ["to-read", "reading", "finished"] as const;
export type ShelfStage = (typeof SHELF_STAGES)[number];

export interface ShelfEntry {
  workId: number;
  stage: ShelfStage;
  addedAt: string;
  updatedAt: string;
  work: PublicWork;
}

export interface PinEntry {
  id: string;
  workId: number;
  locator: string;
  createdAt: string;
  work: PublicWork;
}

export interface ShelfSnapshot {
  entries: ShelfEntry[];
  pins: PinEntry[];
  /** Changes whenever the shelf or pins change; lets clients cheaply detect drift. */
  revision: string;
}

const asStage = (value: string): ShelfStage =>
  (SHELF_STAGES as readonly string[]).includes(value) ? (value as ShelfStage) : "to-read";

export async function readSnapshot(patronId: string): Promise<ShelfSnapshot> {
  const [items, pins] = await Promise.all([
    db.shelfItem.findMany({ where: { patronId }, include: { work: true }, orderBy: { updatedAt: "desc" } }),
    db.pin.findMany({ where: { patronId }, include: { work: true }, orderBy: { createdAt: "desc" } })
  ]);

  const stamps = [
    ...items.map((i) => i.updatedAt.getTime()),
    ...pins.map((p) => p.createdAt.getTime())
  ];
  const latest = stamps.length ? Math.max(...stamps) : 0;

  return {
    entries: items.map((i) => ({
      workId: i.workId,
      stage: asStage(i.stage),
      addedAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
      work: presentWork(i.work)
    })),
    pins: pins.map((p) => ({
      id: p.id,
      workId: p.workId,
      locator: p.locator,
      createdAt: p.createdAt.toISOString(),
      work: presentWork(p.work)
    })),
    revision: `${latest}-${items.length}-${pins.length}`
  };
}

async function assertWork(workId: number) {
  const work = await db.work.findUnique({ where: { id: workId }, select: { id: true } });
  if (!work) throw notFound("That title");
}

export async function keepOnShelf(patronId: string, workId: number, stage: ShelfStage) {
  await assertWork(workId);
  return db.shelfItem.upsert({
    where: { patronId_workId: { patronId, workId } },
    create: { patronId, workId, stage },
    update: { stage }
  });
}

export async function dropFromShelf(patronId: string, workId: number) {
  await db.shelfItem.deleteMany({ where: { patronId, workId } });
}

export async function addPin(patronId: string, workId: number, locator: string) {
  await assertWork(workId);
  return db.pin.create({ data: { patronId, workId, locator: locator.trim() } });
}

export async function removePin(patronId: string, pinId: string) {
  const result = await db.pin.deleteMany({ where: { id: pinId, patronId } });
  if (!result.count) throw notFound("That bookmark");
}

/* ---------- Curator proposals (two-step confirmation) ---------- */

export interface ProposalView {
  id: string;
  stage: ShelfStage;
  works: PublicWork[];
}

/** Stage additions without touching the shelf. Nothing is written until confirmed. */
export async function stageProposal(
  patronId: string,
  workIds: number[],
  stage: ShelfStage
): Promise<ProposalView> {
  const unique = [...new Set(workIds)].slice(0, 12);
  const rows = await db.work.findMany({ where: { id: { in: unique } } });
  if (!rows.length) throw new HttpError(400, "NO_VALID_TITLES", "None of those titles exist in the catalogue.");
  const ordered = unique.map((id) => rows.find((r) => r.id === id)).filter((r) => !!r);
  const proposal = await db.proposal.create({
    data: { patronId, workIds: JSON.stringify(ordered.map((r) => r!.id)), stage }
  });
  return { id: proposal.id, stage, works: ordered.map((r) => presentWork(r!)) };
}

async function ownPending(patronId: string, proposalId: string) {
  const proposal = await db.proposal.findFirst({ where: { id: proposalId, patronId } });
  if (!proposal) throw notFound("That proposal");
  if (proposal.state !== "pending") {
    throw new HttpError(409, "PROPOSAL_CLOSED", `That proposal was already ${proposal.state}.`);
  }
  return proposal;
}

export async function commitProposal(patronId: string, proposalId: string) {
  const proposal = await ownPending(patronId, proposalId);
  const workIds = JSON.parse(proposal.workIds) as number[];
  const stage = asStage(proposal.stage);
  const added: number[] = [];

  await db.$transaction(async (tx) => {
    for (const workId of workIds) {
      const existing = await tx.shelfItem.findUnique({ where: { patronId_workId: { patronId, workId } } });
      if (!existing) {
        await tx.shelfItem.create({ data: { patronId, workId, stage } });
        added.push(workId);
      }
    }
    await tx.proposal.update({ where: { id: proposal.id }, data: { state: "confirmed" } });
  });

  const works = await db.work.findMany({ where: { id: { in: workIds } } });
  return {
    added: works.filter((w) => added.includes(w.id)).map(presentWork),
    alreadyOnShelf: works.filter((w) => !added.includes(w.id)).map(presentWork)
  };
}

export async function dismissProposal(patronId: string, proposalId: string) {
  const proposal = await ownPending(patronId, proposalId);
  await db.proposal.update({ where: { id: proposal.id }, data: { state: "dismissed" } });
}
