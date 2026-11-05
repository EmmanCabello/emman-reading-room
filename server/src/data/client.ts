import "../config/env";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { __emmanDb?: PrismaClient };

export const db: PrismaClient = globalForPrisma.__emmanDb ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__emmanDb = db;
}
