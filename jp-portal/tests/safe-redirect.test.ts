import { describe, expect, it } from "vitest";
import { getSafeInternalRedirect } from "../lib/safe-redirect";

const requestUrl = "https://portal.example.test/auth/callback?code=abc";

describe("getSafeInternalRedirect", () => {
  it("preserva caminhos internos, query string e fragmento", () => {
    expect(getSafeInternalRedirect("/comunidade/forum?page=2#respostas", requestUrl).toString())
      .toBe("https://portal.example.test/comunidade/forum?page=2#respostas");
  });

  it.each([
    "https://attacker.example/login",
    "//attacker.example/login",
    "/\\attacker.example/login",
    "rota-relativa",
  ])("usa a raiz local quando o destino não é um caminho interno seguro: %s", (redirectTo) => {
    expect(getSafeInternalRedirect(redirectTo, requestUrl).toString())
      .toBe("https://portal.example.test/");
  });

  it("usa a raiz local quando o destino está vazio", () => {
    expect(getSafeInternalRedirect(null, requestUrl).toString())
      .toBe("https://portal.example.test/");
  });
});
