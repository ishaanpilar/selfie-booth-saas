import { PrismaClient } from "../generated/client/index.js";

export * from "../generated/client/index.js";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * Singleton PrismaClient. Next.js hot-reloads modules in dev, which would
 * otherwise exhaust the Postgres connection pool by re-instantiating the
 * client on every edit — cache it on `globalThis` instead.
 */
export const prisma: PrismaClient =
  globalThis.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
