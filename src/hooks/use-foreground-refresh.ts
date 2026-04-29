"use client";

import { useEffect, useRef } from "react";

type ForegroundRefreshOptions = {
  enabled?: boolean;
  intervalMs?: number | null;
};

export function useForegroundRefresh(refresh: () => void | Promise<void>, options: ForegroundRefreshOptions = {}) {
  const { enabled = true, intervalMs = null } = options;
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        void refreshRef.current();
      }
    }

    function refreshOnFocus() {
      void refreshRef.current();
    }

    const intervalId = intervalMs ? window.setInterval(() => void refreshRef.current(), intervalMs) : null;

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
