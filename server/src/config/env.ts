import fs from "node:fs";
import path from "node:path";

// Walk up to the server package root (works from both src/ and the compiled dist/src/).
function findServerRoot(): string {
  let dir = __dirname;
  while (!fs.existsSync(path.join(dir, "package.json"))) {
    const parent = path.dirname(dir);
    if (parent === dir) return process.cwd();
    dir = parent;
  }
  return dir;
}
const serverRoot = findServerRoot();
const dotenvPath = path.join(serverRoot, ".env");
if (fs.existsSync(dotenvPath)) {
  try {
    process.loadEnvFile(dotenvPath);
  } catch {
    /* fall through to defaults */
  }
}

const text = (name: string, fallback: string): string => {
  const raw = process.env[name];
  return raw && raw.trim() ? raw.trim() : fallback;
};

// Keep the SQLite file next to the Prisma schema regardless of the working directory.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./emman-archive.db";
}

export const env = {
  port: Number(text("PORT", "4100")),
  jwtSecret: text("JWT_SECRET", "change-me-emman-reading-room"),
  clientOrigins: text("CLIENT_ORIGIN", "http://localhost:5173")
    .split(",")
    .map((s) => s.trim()),
  openaiKey: process.env.OPENAI_API_KEY?.trim() || "",
  openaiModel: text("OPENAI_MODEL", "gpt-4o-mini"),
  openaiBaseUrl: text("OPENAI_BASE_URL", "https://api.openai.com/v1").replace(/\/$/, ""),
  limits: {
    guestDistinctTitles: 5,
    readerDistinctTitles: 10
  },
  paths: {
    serverRoot,
    dataDir: path.join(serverRoot, "src", "data")
  }
};

export type Env = typeof env;
