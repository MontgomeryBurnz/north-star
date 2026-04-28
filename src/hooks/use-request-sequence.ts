"use client";

import { useCallback, useMemo, useRef } from "react";

export function useRequestSequence() {
  const requestRef = useRef(0);

  const beginRequest = useCallback(() => {
    requestRef.current += 1;
    return requestRef.current;
  }, []);

  const isLatestRequest = useCallback((requestId: number) => requestId === requestRef.current, []);

  return useMemo(
    () => ({
      beginRequest,
      isLatestRequest
    }),
    [beginRequest, isLatestRequest]
  );
}
