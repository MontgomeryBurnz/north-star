"use client";

import { useEffect, useRef } from "react";

type ForegroundRefreshOptions = {
  enabled?: boolean;
  intervalMs?: number | null;
};

export function useForegroundRefresh(refresh: () => void | Promise<void>, options: ForegroundRefreshOptions = {}) {
  const { enabled = true, intervalMs = null } = options;
  const refreshInFlightRef = useRef(false);
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;

    function refreshWhenVisible() {
      if (document.visibilityState !== "visible" || refreshInFlightRef.current) return;

      refreshInFlightRef.current = true;
      void Promise.resolve(refreshRef.current()).finally(() => {
        refreshInFlightRef.current = false;
      });
    }

    function refreshOnFocus() {
      refreshWhenVisible();
    }

    const intervalId = intervalMs ? window.setInterval(refreshWhenVisible, intervalMs) : null;

    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [enabled, intervalMs]);
}
