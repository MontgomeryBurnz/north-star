"use client";

import { useEffect } from "react";

type ForegroundRefreshOptions = {
  enabled?: boolean;
  intervalMs?: number | null;
};

export function useForegroundRefresh(refresh: () => void | Promise<void>, options: ForegroundRefreshOptions = {}) {
  const { enabled = true, intervalMs = null } = options;

  useEffect(() => {
    if (!enabled) return;

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }

    function refreshOnFocus() {
      void refresh();
    }

    const intervalId = intervalMs ? window.setInterval(() => void refresh(), intervalMs) : null;

    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [enabled, intervalMs, refresh]);
}
