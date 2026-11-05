import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { env } from "./config/env";
import { db } from "./data/client";
import { adminRouter } from "./http/admin";
import { catalogRouter } from "./http/catalog";
import { HttpError } from "./http/httpError";
import { librarianRouter } from "./http/librarian";
import { loansRouter } from "./http/loans";
import { sessionRouter } from "./http/session";
import { shelvesRouter } from "./http/shelves";
import { identifyVisitor } from "./middleware/authGuard";

export function createApp() {
  const app = express();
  if (process.env.TRUST_PROXY === "true") app.set("trust proxy", true);

  app.use(
    cors({
      origin: (origin, cb) => {
        const allowedOrigins = [
          ...env.clientOrigins,
          "https://emman-reading-room-9ibqrhfr9-emmancabello.vercel.app",
          "https://emman-reading-room.vercel.app",
          "http://localhost:5173"
        ];
        if (!origin || allowedOrigins.includes(origin)) {
          return cb(null, true);
        }
        cb(null, false);
      },
      credentials: true,
    })
  );
  
  app.use(express.json({ limit: "64kb" }));
  app.use(identifyVisitor);

  app.get("/api/health", async (_req, res) => {
    const works = await db.work.count();
    res.json({ ok: true, service: "emman-reading-room", works, librarian: env.openaiKey ? "online" : "offline" });
  });

  app.use("/api/session", sessionRouter);
  // Alias used by the phone app (POST /api/auth/register, /api/auth/login).
  app.use("/api/auth", sessionRouter);
  app.use("/api/catalog", catalogRouter);
  app.use("/api/loans", loansRouter);
  app.use("/api/shelves", shelvesRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/librarian", librarianRouter);

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "No such endpoint." } });
  });

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: { code: err.code, message: err.message, ...err.details } });
    }
    if (err instanceof ZodError) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }
      });
    }
    if (err instanceof SyntaxError && "body" in err) {
      return res.status(400).json({ error: { code: "BAD_JSON", message: "Request body is not valid JSON." } });
    }
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL", message: "Something went wrong on the server." } });
  };
  app.use(onError);

  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Emman Reading Room API listening on http://localhost:${env.port}`);
    console.log(`Archival Research Curator mode: ${env.openaiKey ? "online (OpenAI)" : "offline (rule-based planner)"}`);
  });
}
