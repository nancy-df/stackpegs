import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeGuidance } from "../../shared/custom";
import type { IntegrationResult } from "../../shared/schema";
import { readCache, writeCache } from "../lib/cache";
import { customToolInputs } from "../lib/tools";

export type IntegrationStatus = "idle" | "loading" | "ready" | "error";

export type IntegrationState = {
  status: IntegrationStatus;
  result: IntegrationResult | null;
  error: string | null;
  version: number;
  // The note the current diagram was generated with ("" when none).
  guidance: string;
  // Re-runs the AI. Pass a note to apply it from now on; omit it to keep the current one.
  regenerate: (guidance?: string) => void;
};

const DEBOUNCE_MS = 800;

function hashText(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36);
}

export function useIntegrations(toolIds: string[]): IntegrationState {
  const toolKey = [...toolIds].sort().join(",");
  const [status, setStatus] = useState<IntegrationStatus>("idle");
  const [result, setResult] = useState<IntegrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [nonce, setNonce] = useState(0);
  const [guidance, setGuidance] = useState("");
  const forceRef = useRef(false);

  useEffect(() => {
    const ids = toolKey ? toolKey.split(",") : [];
    if (ids.length < 2) {
      setStatus("idle");
      setResult(null);
      setError(null);
      setGuidance("");
      return;
    }

    const cacheKey = guidance ? `${toolKey}#${hashText(guidance)}` : toolKey;
    const force = forceRef.current;
    forceRef.current = false;

    if (!force) {
      const cached = readCache(cacheKey);
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
          body: JSON.stringify({
            toolIds: ids,
            customTools: customToolInputs(ids),
            ...(guidance ? { guidance } : {}),
          }),
          signal: controller.signal,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error ?? `Request failed (${res.status})`);
        }
        const next: IntegrationResult = { summary: data.summary, edges: data.edges };
        writeCache(cacheKey, next);
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
  }, [toolKey, guidance, nonce]);

  const regenerate = useCallback((next?: string) => {
    forceRef.current = true;
    if (next !== undefined) setGuidance(normalizeGuidance(next));
    setNonce((n) => n + 1);
  }, []);

  return { status, result, error, version, guidance, regenerate };
}
