import { useCallback, useEffect, useRef, useState } from "react";
import type { IntegrationResult } from "../../shared/schema";
import { readCache, writeCache } from "../lib/cache";
import { customToolInputs } from "../lib/tools";

export type IntegrationStatus = "idle" | "loading" | "ready" | "error";

export type IntegrationState = {
  status: IntegrationStatus;
  result: IntegrationResult | null;
  error: string | null;
  version: number;
  regenerate: () => void;
};

const DEBOUNCE_MS = 800;

export function useIntegrations(toolIds: string[]): IntegrationState {
  const key = [...toolIds].sort().join(",");
  const [status, setStatus] = useState<IntegrationStatus>("idle");
  const [result, setResult] = useState<IntegrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [nonce, setNonce] = useState(0);
  const forceRef = useRef(false);

  useEffect(() => {
    const ids = key ? key.split(",") : [];
    if (ids.length < 2) {
      setStatus("idle");
      setResult(null);
      setError(null);
      return;
    }

    const force = forceRef.current;
    forceRef.current = false;

    if (!force) {
      const cached = readCache(key);
      if (cached) {
        setResult(cached);
        setError(null);
        setStatus("ready");
        setVersion((v) => v + 1);
        return;
      }
    }

    const controller = new AbortController();
    setStatus("loading");
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/generate-integrations", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ toolIds: ids, customTools: customToolInputs(ids) }),
          signal: controller.signal,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error ?? `Request failed (${res.status})`);
        }
        const next: IntegrationResult = { summary: data.summary, edges: data.edges };
        writeCache(key, next);
        setResult(next);
        setStatus("ready");
        setVersion((v) => v + 1);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setStatus("error");
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, nonce]);

  const regenerate = useCallback(() => {
    forceRef.current = true;
    setNonce((n) => n + 1);
  }, []);

  return { status, result, error, version, regenerate };
}
