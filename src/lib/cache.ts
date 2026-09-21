import type { IntegrationResult } from "../../shared/schema";

const PREFIX = "appsync:integrations:v1:";

export function readCache(key: string): IntegrationResult | null {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as IntegrationResult) : null;
  } catch {
    return null;
  }
}

export function writeCache(key: string, value: IntegrationResult): void {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // storage unavailable or full; caching is best-effort
  }
}
