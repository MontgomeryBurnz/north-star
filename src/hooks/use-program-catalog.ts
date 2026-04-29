"use client";

import { useCallback, useEffect, useMemo, useState, type SetStateAction } from "react";
import { useRequestSequence } from "@/hooks/use-request-sequence";
import type { StoredProgram } from "@/lib/program-intake-types";

type UseProgramCatalogOptions = {
  initialPrograms?: StoredProgram[];
  initialSelectedProgramId?: string;
  fallbackPrograms?: StoredProgram[];
  fallbackSelectedProgramId?: string;
  requestedProgramId?: string | null;
  autoSelectFirstProgram?: boolean;
  onError?: () => void;
};

const emptyProgramList: StoredProgram[] = [];

function resolveSelectedProgramId(input: {
  requestedProgramId?: string | null;
  currentProgramId: string;
  programs: StoredProgram[];
  fallbackSelectedProgramId?: string;
  autoSelectFirstProgram: boolean;
}) {
  const { requestedProgramId, currentProgramId, programs, fallbackSelectedProgramId, autoSelectFirstProgram } = input;

  if (requestedProgramId && programs.some((program) => program.id === requestedProgramId)) {
    return requestedProgramId;
  }

  if (currentProgramId && programs.some((program) => program.id === currentProgramId)) {
    return currentProgramId;
  }

  if (fallbackSelectedProgramId && programs.some((program) => program.id === fallbackSelectedProgramId)) {
    return fallbackSelectedProgramId;
  }

  return autoSelectFirstProgram ? programs[0]?.id ?? "" : "";
}

export function useProgramCatalog(options: UseProgramCatalogOptions = {}) {
  const {
    initialPrograms = emptyProgramList,
    initialSelectedProgramId = "",
    fallbackPrograms = emptyProgramList,
    fallbackSelectedProgramId = "",
    requestedProgramId,
    autoSelectFirstProgram = true,
    onError
  } = options;
  const request = useRequestSequence();
  const [catalog, setCatalog] = useState(() => ({
    programs: initialPrograms,
    selectedProgramId: initialSelectedProgramId
  }));
  const { programs, selectedProgramId } = catalog;

  const selectedProgram = useMemo(
    () => programs.find((program) => program.id === selectedProgramId) ?? null,
    [programs, selectedProgramId]
  );

  const applyPrograms = useCallback(
    (
      nextProgramsOrUpdater: StoredProgram[] | ((currentPrograms: StoredProgram[]) => StoredProgram[]),
      nextSelectedProgramId?: string
    ) => {
      setCatalog((current) => {
        const nextPrograms =
          typeof nextProgramsOrUpdater === "function" ? nextProgramsOrUpdater(current.programs) : nextProgramsOrUpdater;

        return {
          programs: nextPrograms,
          selectedProgramId: resolveSelectedProgramId({
            requestedProgramId,
            currentProgramId: nextSelectedProgramId ?? current.selectedProgramId,
            programs: nextPrograms,
            fallbackSelectedProgramId,
            autoSelectFirstProgram
          })
        };
      });
    },
    [autoSelectFirstProgram, fallbackSelectedProgramId, requestedProgramId]
  );

  const updateSelectedProgramId = useCallback((nextSelectedProgramId: SetStateAction<string>) => {
    setCatalog((current) => ({
      ...current,
      selectedProgramId:
        typeof nextSelectedProgramId === "function"
          ? nextSelectedProgramId(current.selectedProgramId)
          : nextSelectedProgramId
    }));
  }, []);

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

        if (fallbackPrograms.length || !refreshOptions?.silent) {
          applyPrograms(fallbackPrograms, fallbackSelectedProgramId);
        }
      } catch {
        if (!request.isLatestRequest(requestId)) return;
        if (fallbackPrograms.length || !refreshOptions?.silent) {
          applyPrograms(fallbackPrograms, fallbackSelectedProgramId);
        }
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
    setSelectedProgramId: updateSelectedProgramId,
    refreshPrograms
  };
}
