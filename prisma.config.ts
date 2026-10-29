import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Configuration Prisma 7 (remplace les propriétés déplacées hors de schema.prisma).
// L'URL sert aux commandes Migrate/CLI ; au runtime, le PrismaClient reçoit le
// driver adapter PostgreSQL (voir src/lib/prisma.ts).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
