import { test, expect } from "@playwright/test";

test("homepage carrega com o título e o CTA principal", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Juventude Popular/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /Quero Juntar-me/i }).first()).toBeVisible();
});

test("navegação para Concelhias funciona", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Concelhias" }).first().click();
  await expect(page).toHaveURL(/\/concelhias/);
  await expect(page.getByRole("heading", { name: /concelhia/i })).toBeVisible();
});

test("formulário de adesão exige campos obrigatórios antes de avançar", async ({ page }) => {
  await page.goto("/aderir");
  await page.getByRole("button", { name: /Próximo/i }).click();
  await expect(page.getByText(/Nome demasiado curto|obrigatória|obrigatório/i).first()).toBeVisible();
});

test("documentação permite filtrar por categoria", async ({ page }) => {
  await page.goto("/documentacao");
  await page.getByRole("button", { name: "Estatutos e Regulamentos" }).click();
  await expect(page.getByText(/Estatutos da Juventude Popular/i)).toBeVisible();
});
