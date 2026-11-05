import type { NextFunction, Request, Response } from "express";
import { db } from "../data/client";
import { HttpError } from "../http/httpError";
import { readSessionToken } from "../services/tokenService";

/** Resolve the caller (if any) and normalise the visitor IP. Never rejects. */
export async function identifyVisitor(req: Request, _res: Response, next: NextFunction) {
  req.visitorIp = (req.ip ?? req.socket.remoteAddress ?? "unknown").replace(/^::ffff:/, "");

  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (token) {
    const patronId = readSessionToken(token);
    if (patronId) {
      const patron = await db.patron.findUnique({ where: { id: patronId } });
      if (patron) {
        req.patron = {
          id: patron.id,
          email: patron.email,
          displayName: patron.displayName,
          role: patron.role === "admin" ? "admin" : "reader"
        };
      }
    }
  }
  next();
}

export function requirePatron(req: Request, _res: Response, next: NextFunction) {
  if (!req.patron) throw new HttpError(401, "SIGN_IN_REQUIRED", "Please sign in to continue.");
  next();
}

export function requireCurator(req: Request, _res: Response, next: NextFunction) {
  if (!req.patron) throw new HttpError(401, "SIGN_IN_REQUIRED", "Please sign in to continue.");
  if (req.patron.role !== "admin") {
    throw new HttpError(403, "CURATOR_ONLY", "This area is reserved for curators.");
  }
  next();
}
