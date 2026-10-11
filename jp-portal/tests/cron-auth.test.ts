import { describe, expect, it } from "vitest";
import { getCronAuthResult } from "../lib/cron-auth";

describe("getCronAuthResult", () => {
  it("recusa com estado de configuração ausente", () => {
    expect(getCronAuthResult(undefined, null)).toBe("not_configured");
    expect(getCronAuthResult("", "Bearer qualquer")).toBe("not_configured");
    expect(getCronAuthResult("   ", "Bearer qualquer")).toBe("not_configured");
  });

  it.each([null, "", "Bearer errado", "bearer correto", "correto"])(
    "recusa um cabeçalho ausente ou inválido: %s",
    (authorization) => {
      expect(getCronAuthResult("correto", authorization)).toBe("unauthorized");
    },
  );

  it("autoriza apenas o bearer token exato", () => {
    expect(getCronAuthResult("correto", "Bearer correto")).toBe("authorized");
  });
});
