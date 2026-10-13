import { useCallback, useEffect, useState } from "react";
import { readOpportunity, type OpportunityData } from "./api";

type State = { key: string; data?: OpportunityData; fetchedAt?: number; refreshing: boolean; error?: string };
export function useOpportunity(base: string | null, token: string | null, identifier: string | undefined, contextVersion: string) {
  const key = `${base ?? ""}:${identifier ?? ""}`;
  const [state, setState] = useState<State>({ key, refreshing: false });
  const [tick, setTick] = useState(0);
  const retry = useCallback(() => setTick(value => value + 1), []);
  useEffect(() => {
    if (!base || !token || !identifier) return;
    let disposed = false;
    let active: AbortController | undefined;
    async function refresh() {
      if (active) return;
      const controller = new AbortController();
      active = controller;
      setState(previous => ({ ...(previous.key === key ? previous : { key }), refreshing: true, error: undefined }));
      try {
        const data = await readOpportunity(base!, token!, identifier!, controller.signal);
        if (!disposed) setState({ key, data, fetchedAt: Date.now(), refreshing: false });
      } catch (error) {
        if (!disposed && !controller.signal.aborted) {
          console.error("[opportunity-lifecycle] Refresh failed", error);
          setState(previous => ({ ...(previous.key === key ? previous : { key }), refreshing: false, error: error instanceof Error ? error.message : "Could not load opportunity. Please retry." }));
        }
      } finally { active = undefined; }
    }
    void refresh();
    const timer = window.setInterval(() => { if (document.visibilityState !== "hidden") void refresh(); }, 60_000);
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { disposed = true; active?.abort(); window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [base, token, identifier, key, contextVersion, tick]);
  const visible = state.key === key && !!token && !!identifier ? state : { key, refreshing: false };
  return { ...visible, retry };
}
