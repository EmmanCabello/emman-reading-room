import bcrypt from "bcryptjs";
import { env } from "../config/env";
import { db } from "./client";
import { buildSeedWorks } from "./catalog-seed";

/** Test accounts for the Emman Reading Room. */
export const EMMAN_ACCOUNTS = [
  {
    email: "emman@emman.local",
    password: "Emman123!",
    displayName: "Emman",
    role: "reader"
  },
  {
    email: "emman.admin@emman.local",
    password: "EmmanAdmin123!",
    displayName: "Emman (Curator)",
    role: "admin"
  }
] as const;

async function main() {
  void env;
  // Clean slate: remove everything in dependency order.
  await db.proposal.deleteMany();
  await db.pin.deleteMany();
  await db.shelfItem.deleteMany();
  await db.retrieval.deleteMany();
  await db.guestRetrieval.deleteMany();
  await db.work.deleteMany();
  await db.patron.deleteMany();

  const works = buildSeedWorks();
  await db.work.createMany({ data: works });

  for (const account of EMMAN_ACCOUNTS) {
    await db.patron.create({
      data: {
        email: account.email,
        displayName: account.displayName,
        role: account.role,
        passwordHash: await bcrypt.hash(account.password, 10)
      }
    });
  }

  // A small starter shelf so the reader account has something to show on web and phone.
  const reader = await db.patron.findUniqueOrThrow({ where: { email: "emman@emman.local" } });
  const starters = [
    ["on-the-origin-of-species-charles-darwin", "reading"],
    ["twenty-thousand-leagues-under-the-sea-jules-verne", "to-read"],
    ["narrative-of-the-life-of-frederick-douglass-frederick-douglass", "finished"]
  ] as const;
  for (const [slug, stage] of starters) {
    const work = await db.work.findUnique({ where: { slug } });
    if (work) await db.shelfItem.create({ data: { patronId: reader.id, workId: work.id, stage } });
  }

  const count = await db.work.count();
  console.log(`Seeded ${count} works and ${EMMAN_ACCOUNTS.length} accounts.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
