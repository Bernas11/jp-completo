import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // NÃO é o NEXT_PUBLIC_SUPABASE_URL (esse é a URL da API REST).
    // Vai a Supabase Dashboard → Project Settings → Database →
    // Connection string → escolhe "URI" no modo "Session" (porta 5432,
    // não a 6543 do pooler) e cola aqui via variável de ambiente.
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
