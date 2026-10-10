// Copiar para jp-portal/tests/e2e/
import { test, expect } from "@playwright/test";

const PROTEGIDAS = [
  "/", "/mural", "/eventos", "/sondagens", "/wiki", "/documentos", "/arquivo",
  "/mensagens", "/notificacoes", "/perfil", "/moderacao", "/comunidade/forum",
];
const PUBLICAS = ["/login", "/politica-cookies", "/politica-privacidade", "/termos-condicoes"];

for (const rota of PROTEGIDAS) {
  test(`${rota} sem sessão -> /login`, async ({ page }) => {
    await page.goto(rota);
    await expect(page).toHaveURL(/\/login/);
  });
}

for (const rota of PUBLICAS) {
  test(`${rota} é pública e carrega`, async ({ page }) => {
    const res = await page.goto(rota);
    expect(res?.status()).toBeLessThan(400);
  });
}

test("verificação de nº de militante inexistente não rebenta", async ({ page }) => {
  const res = await page.goto("/verificar/0000000");
  expect(res?.status()).toBeLessThan(500);
});

test("login pede email e confirma envio do link", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("nome@exemplo.pt").fill("playwright@example.com");
  await page.getByRole("button", { name: "Enviar link de acesso" }).click();
  await expect(page.getByText(/Enviámos um link de acesso|Demasiados pedidos/)).toBeVisible({ timeout: 10_000 });
});
