// Copiar para jp-nacional/tests/  — correr: npx playwright test tests/smoke.spec.ts
import { test, expect } from "@playwright/test";

const ROTAS = [
  "/", "/aderir", "/concelhias", "/contactos", "/documentacao", "/historia",
  "/carta-de-principios", "/orgaos-nacionais", "/anteriores-lideres",
  "/marca-jp", "/goncalo-begonha", "/politica-cookies",
  "/politica-privacidade", "/termos-condicoes",
];

for (const rota of ROTAS) {
  test(`rota ${rota} carrega sem erro`, async ({ page }) => {
    const erros: string[] = [];
    page.on("pageerror", (e) => erros.push(e.message));
    const res = await page.goto(rota);
    expect(res?.status(), `HTTP em ${rota}`).toBeLessThan(400);
    await expect(page.locator("body")).not.toContainText(/Application error|Internal Server Error/i);
    expect(erros, `erros JS em ${rota}`).toEqual([]);
  });
}

test("rota inexistente mostra página 404 tratada", async ({ page }) => {
  const res = await page.goto("/nao-existe-xyz");
  expect(res?.status()).toBe(404);
});

test("formulário de adesão: valida passo 1 vazio", async ({ page }) => {
  await page.goto("/aderir");
  await page.getByRole("button", { name: /Próximo/i }).click();
  await expect(page.getByText(/Nome demasiado curto|obrigatóri/i).first()).toBeVisible();
});

test("formulário de adesão: avança para o passo 2 com dados válidos", async ({ page }) => {
  await page.goto("/aderir");
  await page.locator("#nome").fill("Teste Playwright");
  await page.locator("#dataNascimento").fill("2000-01-15");
  await page.locator("#email").fill("playwright@example.com");
  await page.locator("#telemovel").fill("912345678");
  await page.getByRole("button", { name: /Próximo/i }).click();
  await expect(page.locator("#morada")).toBeVisible();
});

// SUBMISSÃO REAL: cria um pedido na BD e envia emails. Só corre com E2E_ALLOW_WRITE=1.
test("adesão completa cria pedido (escreve na BD)", async ({ page }) => {
  test.skip(!process.env.E2E_ALLOW_WRITE, "defina E2E_ALLOW_WRITE=1 para correr");
  await page.goto("/aderir");
  await page.locator("#nome").fill("Teste Playwright");
  await page.locator("#dataNascimento").fill("2000-01-15");
  await page.locator("#email").fill("playwright@example.com");
  await page.locator("#telemovel").fill("912345678");
  await page.getByRole("button", { name: /Próximo/i }).click();
  await page.locator("#morada").fill("Rua de Teste");
  await page.locator("#numero").fill("1");
  await page.locator("#localidade").fill("Lisboa");
  await page.locator("#codigoPostal").fill("1000-001");
  await page.locator("#distrito").selectOption({ index: 1 });
  await page.locator("#concelho").selectOption({ index: 1 });
  await page.getByRole("button", { name: /Próximo/i }).click();
  await page.locator("#numeroCC").fill("12345678");
  await page.locator('input[type="file"]').setInputFiles({
    name: "cc.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 teste"),
  });
  await page.locator('input[type="checkbox"]').check();
  await page.getByRole("button", { name: /Submeter|Enviar|Aderir/i }).click();
  await expect(page).toHaveURL(/sucesso/, { timeout: 20_000 });
});

test("newsletter rejeita email inválido (API)", async ({ request }) => {
  const res = await request.post("/api/newsletter", { data: { email: "invalido" } });
  expect(res.status()).toBeGreaterThanOrEqual(400);
});
