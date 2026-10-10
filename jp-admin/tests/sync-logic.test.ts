import { describe, it, expect } from "vitest";
import {
  portalUrlFor,
  nextEligibleAt,
  signPayload,
} from "../../supabase-functions/_shared/sync-logic";

const urls = { member: "https://portal.example/sync-member", event: "https://portal.example/sync-event" };

describe("portalUrlFor", () => {
  it("envia eventos 'event_*' para o URL de eventos", () => {
    expect(portalUrlFor("event_created", urls)).toBe(urls.event);
    expect(portalUrlFor("event_cancelled", urls)).toBe(urls.event);
  });

  it("envia todos os outros eventos (ex: membership) para o URL de membros", () => {
    expect(portalUrlFor("membership_approved", urls)).toBe(urls.member);
    expect(portalUrlFor("member_updated", urls)).toBe(urls.member);
  });
});

describe("nextEligibleAt", () => {
  const now = new Date("2026-01-01T00:00:00.000Z").getTime();

  it("duplica o atraso a cada tentativa: 1, 2, 4, 8 minutos...", () => {
    expect(nextEligibleAt(0, now).getTime() - now).toBe(1 * 60_000);
    expect(nextEligibleAt(1, now).getTime() - now).toBe(2 * 60_000);
    expect(nextEligibleAt(2, now).getTime() - now).toBe(4 * 60_000);
    expect(nextEligibleAt(3, now).getTime() - now).toBe(8 * 60_000);
  });

  it("tem um teto de 60 minutos, mesmo com muitas tentativas", () => {
    expect(nextEligibleAt(10, now).getTime() - now).toBe(60 * 60_000);
    expect(nextEligibleAt(20, now).getTime() - now).toBe(60 * 60_000);
  });
});

describe("signPayload", () => {
  it("produz sempre a mesma assinatura para o mesmo corpo e segredo", async () => {
    const a = await signPayload('{"eventId":"1"}', "segredo-partilhado");
    const b = await signPayload('{"eventId":"1"}', "segredo-partilhado");
    expect(a).toBe(b);
  });

  it("produz assinaturas diferentes para corpos diferentes", async () => {
    const a = await signPayload('{"eventId":"1"}', "segredo-partilhado");
    const b = await signPayload('{"eventId":"2"}', "segredo-partilhado");
    expect(a).not.toBe(b);
  });

  it("produz assinaturas diferentes para segredos diferentes", async () => {
    const a = await signPayload('{"eventId":"1"}', "segredo-a");
    const b = await signPayload('{"eventId":"1"}', "segredo-b");
    expect(a).not.toBe(b);
  });

  it("devolve hex de 64 caracteres (SHA-256)", async () => {
    const sig = await signPayload("qualquer corpo", "segredo");
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });
});
