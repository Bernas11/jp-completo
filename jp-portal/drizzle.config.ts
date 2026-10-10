import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Connection string do PROJETO B (portal), não do Projeto A.
    // Dashboard → Project Settings → Database → Connection string → "URI",
    // modo "Session" (porta 5432).
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
