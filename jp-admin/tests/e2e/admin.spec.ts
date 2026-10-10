// Copiar para jp-admin/tests/e2e/
// Env: E2E_BASE_URL, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, E2E_ADMIN_TOTP_SECRET (base32; opcional)
import { test, expect, type Page } from "@playwright/test";
import { generate } from "otplib";

const ROTAS_PROTEGIDAS = [
  "/", "/militancia/pedidos", "/militancia/membros", "/militancia/importar",
  "/estrutura/concelhias", "/estrutura/distritais", "/estrutura/orgaos-nacionais",
  "/estrutura/lideres", "/noticias", "/documentacao", "/loja/produtos",
  "/loja/encomendas", "/comunicacao", "/eventos", "/estatisticas",
  "/auditoria", "/administradores", "/perfil",
];

test.describe("sem sessão", () => {
  for (const rota of ROTAS_PROTEGIDAS) {
    test(`${rota} redireciona para /login`, async ({ page }) => {
      await page.goto(rota);
      await expect(page).toHaveURL(/\/login/);
    });
  }

  test("rejeita credenciais inválidas", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Email institucional").fill("invalido@example.pt");
    await page.getByPlaceholder("Palavra-passe").fill("errada");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Email ou palavra-passe incorretos.")).toBeVisible();
  });
});

async function login(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("Email institucional").fill(process.env.E2E_ADMIN_EMAIL!);
  await page.getByPlaceholder("Palavra-passe").fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByPlaceholder("Código de 6 dígitos").fill(await generate({ secret: process.env.E2E_ADMIN_TOTP_SECRET! }));
  await page.keyboard.press("Enter");
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15_000 });
}

test.describe("com sessão (CPN)", () => {
  test.skip(!process.env.E2E_ADMIN_TOTP_SECRET, "defina E2E_ADMIN_TOTP_SECRET");

  for (const rota of ROTAS_PROTEGIDAS) {
    test(`${rota} abre sem erro`, async ({ page }) => {
      await login(page);
      const res = await page.goto(rota);
      expect(res?.status()).toBeLessThan(400);
      await expect(page).not.toHaveURL(/sem-permissao|login/);
      await expect(page.locator("body")).not.toContainText(/Application error|Não foi possível carregar/i);
    });
  }
});
