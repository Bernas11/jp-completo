import { test, expect } from "@playwright/test";

test.describe("Login do Admin", () => {
  test("pede código TOTP depois de email/palavra-passe corretos", async ({ page }) => {
    await page.goto("/login");

    await page.getByPlaceholder("Email institucional").fill(process.env.E2E_ADMIN_EMAIL!);
    await page.getByPlaceholder("Palavra-passe").fill(process.env.E2E_ADMIN_PASSWORD!);
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page.getByPlaceholder("Código de 6 dígitos")).toBeVisible();
  });

  test("rejeita credenciais inválidas", async ({ page }) => {
    await page.goto("/login");

    await page.getByPlaceholder("Email institucional").fill("invalido@example.pt");
    await page.getByPlaceholder("Palavra-passe").fill("password-errada");
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page.getByText("Email ou palavra-passe incorretos.")).toBeVisible();
  });
});
