import { PrismaClient } from "@prisma/client";
import { PrismaClient as PostgresPrismaClient } from "@docforge/prisma-postgres";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const log = process.env.NODE_ENV === "development" ? ["error", "warn"] as const : ["error"] as const;
const usePostgres = process.env.DATABASE_PROVIDER === "postgresql";

if (usePostgres && !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set when DATABASE_PROVIDER=postgresql.");
}

// Both generated schemas expose the same models; only the database provider differs.
export const db: PrismaClient = globalForPrisma.prisma ??= usePostgres
  ? new PostgresPrismaClient({ log: [...log] }) as unknown as PrismaClient
  : new PrismaClient({ log: [...log] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
