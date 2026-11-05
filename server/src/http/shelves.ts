import { Router } from "express";
import { z } from "zod";
import { requirePatron } from "../middleware/authGuard";
import {
  SHELF_STAGES,
  addPin,
  dropFromShelf,
  keepOnShelf,
  readSnapshot,
  removePin
} from "../services/shelfService";
import { badRequest } from "./httpError";

export const shelvesRouter = Router();
shelvesRouter.use(requirePatron);

const workParam = (raw: unknown): number => {
  const id = Number(raw);
  if (!Number.isInteger(id)) throw badRequest("Invalid title id.");
  return id;
};

/** One snapshot of shelf entries + bookmarks; web and phone both read this. */
shelvesRouter.get("/", async (req, res) => {
  res.json(await readSnapshot(req.patron!.id));
});

shelvesRouter.put("/:workId", async (req, res) => {
  const { stage } = z.object({ stage: z.enum(SHELF_STAGES).default("to-read") }).parse(req.body ?? {});
  await keepOnShelf(req.patron!.id, workParam(req.params.workId), stage);
  res.json(await readSnapshot(req.patron!.id));
});

shelvesRouter.delete("/:workId", async (req, res) => {
  await dropFromShelf(req.patron!.id, workParam(req.params.workId));
  res.json(await readSnapshot(req.patron!.id));
});

shelvesRouter.post("/:workId/pins", async (req, res) => {
  const { locator } = z.object({ locator: z.string().max(200).default("") }).parse(req.body ?? {});
  await addPin(req.patron!.id, workParam(req.params.workId), locator);
  res.status(201).json(await readSnapshot(req.patron!.id));
});

shelvesRouter.delete("/pins/:pinId", async (req, res) => {
  await removePin(req.patron!.id, String(req.params.pinId));
  res.json(await readSnapshot(req.patron!.id));
});
