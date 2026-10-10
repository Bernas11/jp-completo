import { test, expect } from "@playwright/test";

test.describe("Login do Portal", () => {
  test("mostra o ecrã de confirmação após pedir o link de acesso", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText("Portal Juventude Popular")).toBeVisible();

    await page.getByPlaceholder("O teu email").fill("militante-teste@example.com");
    await page.getByRole("button", { name: "Enviar link de acesso" }).click();

    await expect(page.getByText(/Enviámos um link de acesso/)).toBeVisible({ timeout: 10_000 });
  });

  test("mostra aviso de rate limit ao exceder pedidos no mesmo IP", async ({ page }) => {
    await page.goto("/login");

    // o limite é 5 pedidos / 10min por IP — no ambiente de staging o
    // limiter em memória reinicia a cada deploy, por isso 6 pedidos
    // seguidos chegam sempre ao bloqueio dentro deste teste isolado
    for (let i = 0; i < 6; i++) {
      await page.getByPlaceholder("O teu email").fill(`teste-ratelimit-${i}@example.com`);
      await page.getByRole("button", { name: "Enviar link de acesso" }).click();
      await page.waitForTimeout(300);
      if (i < 5) {
        await page.goto("/login");
      }
    }

    await expect(page.getByText(/Demasiados pedidos/)).toBeVisible({ timeout: 10_000 });
  });
});
