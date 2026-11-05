import fs from "node:fs";
import path from "node:path";

const serverRoot = path.resolve(__dirname, "..");
const dataDir = path.join(serverRoot, "src", "data");

// Make sure a usable .env exists before the Prisma CLI runs.
const envFile = path.join(serverRoot, ".env");
const exampleFile = path.join(serverRoot, ".env.example");
if (!fs.existsSync(envFile) && fs.existsSync(exampleFile)) {
  fs.copyFileSync(exampleFile, envFile);
  console.log("Created server/.env from .env.example");
}

// Remove every SQLite artefact (old and new names) and the old migration history.
const doomed = ["dev.db", "reading-room.db", "emman-archive.db"];
for (const name of doomed) {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    for (const dir of [dataDir, serverRoot, path.join(serverRoot, "prisma")]) {
      const file = path.join(dir, name + suffix);
      if (fs.existsSync(file)) {
        fs.rmSync(file);
        console.log("Removed", path.relative(serverRoot, file));
      }
    }
  }
}
console.log("Database files wiped.");
