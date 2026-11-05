import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { converse } from "../librarian/conversation";
import { PERSONA_GREETING, PERSONA_NAME } from "../librarian/persona";
import { requirePatron } from "../middleware/authGuard";
import { commitProposal, dismissProposal, readSnapshot } from "../services/shelfService";

export const librarianRouter = Router();

librarianRouter.get("/status", (req, res) => {
  res.json({
    persona: PERSONA_NAME,
    greeting: PERSONA_GREETING,
    mode: env.openaiKey ? "online" : "offline",
    canStage: !!req.patron
  });
});

const chatBody = z.object({
  message: z.string().trim().min(1).max(800),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .max(30)
    .default([]),
  focusIds: z.array(z.number().int()).max(12).default([])
});

/** Guests may chat; staging titles requires a signed-in reader. */
librarianRouter.post("/chat", async (req, res) => {
  const body = chatBody.parse(req.body);
  const turn = await converse({
    patronId: req.patron?.id ?? null,
    message: body.message,
    history: body.history,
    focusIds: body.focusIds
  });
  res.json(turn);
});

const proposalBody = z.object({ proposalId: z.string().min(1).max(64) });

/** Step two of the two-step flow: only this endpoint writes staged titles to the shelf. */
librarianRouter.post("/confirm", requirePatron, async (req, res) => {
  const { proposalId } = proposalBody.parse(req.body);
  const outcome = await commitProposal(req.patron!.id, proposalId);
  res.json({ ...outcome, shelf: await readSnapshot(req.patron!.id) });
});

librarianRouter.post("/dismiss", requirePatron, async (req, res) => {
  const { proposalId } = proposalBody.parse(req.body);
  await dismissProposal(req.patron!.id, proposalId);
  res.json({ dismissed: true });
});
