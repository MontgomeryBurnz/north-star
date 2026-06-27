"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ManagedAppUser, ManagedProgramAssignment } from "@/lib/admin-user-types";
import { buildRoleAwareUiProfile } from "@/lib/role-aware-ui";

type CurrentUserAssignmentsPayload = {
  assignmentSource: "none" | "supabase";
  user: ManagedAppUser | null;
};

export function useCurrentUserAssignments() {
  const [currentUser, setCurrentUser] = useState<ManagedAppUser | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAssignments() {
      try {
        const response = await fetch("/api/me", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as CurrentUserAssignmentsPayload;
        if (!cancelled) {
          setCurrentUser(payload.user);
        }
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    }

    void loadAssignments();

    return () => {
      cancelled = true;
    };
  }, []);

  const assignments = useMemo(() => currentUser?.assignments ?? [], [currentUser?.assignments]);
  const primaryAssignment = useMemo(
    () => assignments.find((assignment) => assignment.isPrimary) ?? assignments[0] ?? null,
    [assignments]
  );
  const getAssignmentForProgram = useCallback(
    (programId: string): ManagedProgramAssignment | null =>
      assignments.find((assignment) => assignment.programId === programId) ?? null,
    [assignments]
  );
  const getRoleUiProfileForProgram = useCallback(
    (programId: string, availableRoles: string[]) => buildRoleAwareUiProfile(currentUser, programId, availableRoles),
    [currentUser]
  );

  return {
    assignments,
    currentUser,
    getAssignmentForProgram,
    getRoleUiProfileForProgram,
    loaded,
    primaryAssignment
  };
}
