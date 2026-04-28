"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRequestSequence } from "@/hooks/use-request-sequence";
import type { StoredProgram } from "@/lib/program-intake-types";

type UseProgramCatalogOptions = {
  initialPrograms?: StoredProgram[];
  initialSelectedProgramId?: string;
  fallbackPrograms?: StoredProgram[];
  fallbackSelectedProgramId?: string;
  requestedProgramId?: string | null;
  onError?: () => void;
};

function resolveSelectedProgramId(input: {
  requestedProgramId?: string | null;
  currentProgramId: string;
  programs: StoredProgram[];
  fallbackSelectedProgramId?: string;
}) {
  const { requestedProgramId, currentProgramId, programs, fallbackSelectedProgramId } = input;

  if (requestedProgramId && programs.some((program) => program.id === requestedProgramId)) {
    return requestedProgramId;
  }

  if (currentProgramId && programs.some((program) => program.id === currentProgramId)) {
    return currentProgramId;
  }

  if (fallbackSelectedProgramId && programs.some((program) => program.id === fallbackSelectedProgramId)) {
    return fallbackSelectedProgramId;
  }

  return programs[0]?.id ?? "";
}

export function useProgramCatalog(options: UseProgramCatalogOptions = {}) {
  const {
    initialPrograms = [],
    initialSelectedProgramId = "",
    fallbackPrograms = [],
    fallbackSelectedProgramId = "",
    requestedProgramId,
    onError
  } = options;
  const request = useRequestSequence();
  const [programs, setPrograms] = useState<StoredProgram[]>(initialPrograms);
  const [selectedProgramId, setSelectedProgramId] = useState(initialSelectedProgramId);

  const selectedProgram = useMemo(
    () => programs.find((program) => program.id === selectedProgramId) ?? null,
    [programs, selectedProgramId]
  );

  const applyPrograms = useCallback(
    (nextPrograms: StoredProgram[], nextSelectedProgramId?: string) => {
      setPrograms(nextPrograms);
      setSelectedProgramId((current) =>
        resolveSelectedProgramId({
          requestedProgramId,
          currentProgramId: nextSelectedProgramId ?? current,
          programs: nextPrograms,
          fallbackSelectedProgramId
        })
      );
    },
    [fallbackSelectedProgramId, requestedProgramId]
  );

  const refreshPrograms = useCallback(
    async (refreshOptions?: { silent?: boolean }) => {
      const requestId = request.beginRequest();

      try {
        const response = await fetch("/api/programs", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Could not load programs.");
        }

        const payload = (await response.json()) as { programs: StoredProgram[] };
        if (!request.isLatestRequest(requestId)) return;

        if (payload.programs.length) {
          applyPrograms(payload.programs);
          return;
        }

        applyPrograms(fallbackPrograms, fallbackSelectedProgramId);
      } catch {
        if (!request.isLatestRequest(requestId)) return;
        applyPrograms(fallbackPrograms, fallbackSelectedProgramId);
        if (!refreshOptions?.silent) {
          onError?.();
        }
      }
    },
    [applyPrograms, fallbackPrograms, fallbackSelectedProgramId, onError, request]
  );

  useEffect(() => {
    void refreshPrograms();
  }, [refreshPrograms]);

  return {
    programs,
    setPrograms: applyPrograms,
    selectedProgram,
    selectedProgramId,
    setSelectedProgramId,
    refreshPrograms
  };
}
