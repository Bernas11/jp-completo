import { defineConfig } from "vitest/config";
import path from "path";

// testes unitários ficam fora de tests/ de propósito: o playwright.config.ts
// já usa testDir: "./tests" com o testMatch por defeito (que apanha tanto
// *.spec.ts como *.test.ts) — misturar aqui faria o Playwright tentar
// correr estes testes de unidade como e2e.
export default defineConfig({
  css: {
    postcss: { plugins: [] },
  },
  test: {
    environment: "node",
    include: ["tests-unit/**/*.test.ts"],
    css: false,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
