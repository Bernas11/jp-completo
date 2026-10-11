export type CronAuthResult = "authorized" | "unauthorized" | "not_configured";

/** Fail-closed: o endpoint de cron não fica público se faltar CRON_SECRET. */
export function getCronAuthResult(secret: string | undefined, authorization: string | null): CronAuthResult {
  if (!secret?.trim()) return "not_configured";
  return authorization === `Bearer ${secret}` ? "authorized" : "unauthorized";
}
