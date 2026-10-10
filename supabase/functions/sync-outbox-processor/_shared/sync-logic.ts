export function portalUrlFor(
  eventType: string,
  urls: { member: string; event: string },
): string {
  return eventType.startsWith("event_") ? urls.event : urls.member;
}

export function nextEligibleAt(attempts: number, now: number = Date.now()): Date {
  const delayMinutes = Math.min(2 ** attempts, 60);
  return new Date(now + delayMinutes * 60_000);
}

export async function signPayload(body: string, sharedSecret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sharedSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
