import { Router } from "express";
import { z } from "zod";
import { getWork, listRooms, relatedWorks, searchWorks } from "../services/catalogService";
import { notFound } from "./httpError";

export const catalogRouter = Router();

const query = z.object({
  q: z.string().max(200).optional(),
  room: z.string().max(60).optional(),
  author: z.string().max(80).optional(),
  sort: z.enum(["relevance", "title", "year", "author"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(60).optional()
});

catalogRouter.get("/", async (req, res) => {
  res.json(await searchWorks(query.parse(req.query)));
});

catalogRouter.get("/rooms", async (_req, res) => {
  res.json({ rooms: await listRooms() });
});

catalogRouter.get("/:workId", async (req, res) => {
  const id = Number(req.params.workId);
  const work = Number.isInteger(id) ? await getWork(id) : null;
  if (!work) throw notFound("That title");
  res.json({ work, related: await relatedWorks(id) });
});
