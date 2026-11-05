import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { db } from "../data/client";
import { requirePatron } from "../middleware/authGuard";
import { issueSessionToken } from "../services/tokenService";
import { HttpError } from "./httpError";

export const sessionRouter = Router();

const credentials = z.object({
  email: z.string().trim().toLowerCase().email().max(160),
  password: z.string().min(1).max(200)
});

const registration = credentials.extend({
  password: z.string().min(8).max(200),
  displayName: z.string().trim().min(1).max(60)
});

function describe(patron: { id: string; email: string; displayName: string; role: string }) {
  return {
    id: patron.id,
    email: patron.email,
    displayName: patron.displayName,
    role: patron.role === "admin" ? "admin" : "reader"
  };
}

sessionRouter.post("/login", async (req, res) => {
  const { email, password } = credentials.parse(req.body);
  const patron = await db.patron.findUnique({ where: { email } });
  const ok = patron ? await bcrypt.compare(password, patron.passwordHash) : false;
  if (!patron || !ok) throw new HttpError(401, "BAD_CREDENTIALS", "That email and password do not match.");
  res.json({ token: issueSessionToken(patron.id), patron: describe(patron) });
});

sessionRouter.post("/register", async (req, res) => {
  const { email, password, displayName } = registration.parse(req.body);
  const taken = await db.patron.findUnique({ where: { email } });
  if (taken) throw new HttpError(409, "EMAIL_TAKEN", "An account with that email already exists.");
  const patron = await db.patron.create({
    data: { email, displayName, passwordHash: await bcrypt.hash(password, 10), role: "reader" }
  });
  res.status(201).json({ token: issueSessionToken(patron.id), patron: describe(patron) });
});

sessionRouter.get("/me", requirePatron, (req, res) => {
  res.json({ patron: req.patron });
});
