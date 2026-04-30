"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, MailCheck, MailWarning, Pencil, PlusCircle, RefreshCw, ShieldCheck, Trash2, UserPlus, UsersRound, XCircle } from "lucide-react";
import type {
  AppUserCredentialStatus,
  AppUserType,
  ManagedAppUser,
  ManagedProgramAssignment,
  ManagedProgramAssignmentInput
} from "@/lib/admin-user-types";
import { appUserCredentialStatuses, appUserTypes, isProgramScopedUserType } from "@/lib/admin-user-types";
import type { StoredProgram } from "@/lib/program-intake-types";
import { normalizeTeamRoles } from "@/lib/team-roles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const userTypeLabels: Record<AppUserType, string> = {
  admin: "Admin",
  leadership: "Leadership",
  "delivery-lead": "Delivery Lead",
  "team-member": "Team Member",
  client: "Client",
  viewer: "Viewer"
};

const credentialStatusLabels: Record<AppUserCredentialStatus, string> = {
  "not-invited": "Not invited",
  invited: "Invited",
  active: "Active",
  disabled: "Disabled"
};

const emptyForm = {
  id: "",
  name: "",
  email: "",
  userType: "team-member" as AppUserType,
  credentialStatus: "not-invited" as AppUserCredentialStatus,
  programId: "",
  role: ""
};

type AssignmentDraft = Pick<ManagedProgramAssignment, "programId" | "programName" | "role" | "isPrimary">;

type InvitationProviderStatus = {
  configured: boolean;
  emailDelivery: "north-star-branded" | "supabase-default";
  provider: "supabase";
};

function getProgramRoles(program: StoredProgram | undefined) {
  return program ? normalizeTeamRoles(program.intake.teamRoles) : [];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function getPrimaryAssignment(assignments: ManagedProgramAssignment[]) {
  return assignments.find((assignment) => assignment.isPrimary) ?? assignments[0];
}

function getAssignmentDraftKey(assignment: Pick<ManagedProgramAssignment, "programId" | "role">) {
  return `${assignment.programId}::${assignment.role.trim().toLowerCase()}`;
}

export function AdminUserManagementCard() {
  const [programs, setPrograms] = useState<StoredProgram[]>([]);
  const [users, setUsers] = useState<ManagedAppUser[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [assignmentDrafts, setAssignmentDrafts] = useState<AssignmentDraft[]>([]);
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveAction, setSaveAction] = useState<"save" | "invite">("save");
  const [status, setStatus] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"neutral" | "success" | "error">("neutral");
  const [invitationProvider, setInvitationProvider] = useState<InvitationProviderStatus | null>(null);
  const [newProgramRole, setNewProgramRole] = useState("");
  const [roleSaveState, setRoleSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [roleStatus, setRoleStatus] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const selectedProgram = useMemo(
    () => programs.find((program) => program.id === form.programId),
    [form.programId, programs]
  );
  const availableRoles = useMemo(() => getProgramRoles(selectedProgram), [selectedProgram]);
  const programAssignmentRequired = isProgramScopedUserType(form.userType);
  const selectedAssignmentDraftKey = form.programId && form.role
    ? getAssignmentDraftKey({ programId: form.programId, role: form.role })
    : "";
  const hasSelectedAssignmentDraft = selectedAssignmentDraftKey
    ? assignmentDrafts.some((assignment) => getAssignmentDraftKey(assignment) === selectedAssignmentDraftKey)
    : false;
  const canSaveUser = Boolean(
    form.name.trim() && form.email.trim() && (!programAssignmentRequired || assignmentDrafts.length)
  );
  const canAddAssignmentDraft = Boolean(
    programAssignmentRequired &&
      selectedProgram &&
      form.programId &&
      form.role &&
      !hasSelectedAssignmentDraft &&
      saveState !== "saving"
  );
  const canAddProgramRole = Boolean(selectedProgram && newProgramRole.trim() && roleSaveState !== "saving");
  const brandedEmailActive = invitationProvider?.configured && invitationProvider.emailDelivery === "north-star-branded";
  const editingUser = form.id ? users.find((user) => user.id === form.id) : undefined;
  const isEditingUser = Boolean(form.id);

  const loadAdminUsers = useCallback(async () => {
    setStatus("Loading users and programs...");
    setStatusTone("neutral");

    try {
      const [usersResponse, programsResponse] = await Promise.all([
        fetch("/api/admin/users", { cache: "no-store" }),
        fetch("/api/programs", { cache: "no-store" })
      ]);

      if (!usersResponse.ok || !programsResponse.ok) {
        throw new Error("load-admin-users");
      }

      const usersPayload = (await usersResponse.json()) as {
        invitationProvider: InvitationProviderStatus;
        users: ManagedAppUser[];
      };
      const programsPayload = (await programsResponse.json()) as { programs: StoredProgram[] };
      setUsers(usersPayload.users);
      setInvitationProvider(usersPayload.invitationProvider);
      setPrograms(programsPayload.programs);
      setStatus(null);
    } catch {
      setStatusTone("error");
      setStatus("Could not load Admin users. Confirm leadership access and try again.");
    }
  }, []);

  useEffect(() => {
    void loadAdminUsers();
  }, [loadAdminUsers]);

  function resetUserForm() {
    setForm((current) => ({
      ...emptyForm,
      programId: current.programId,
      role: current.role
    }));
    setAssignmentDrafts([]);
    setSaveState("idle");
    setStatus(null);
    setStatusTone("neutral");
  }

  function editUserAccess(user: ManagedAppUser) {
    const primaryAssignment = getPrimaryAssignment(user.assignments);
    setForm({
      id: user.id,
      name: user.name,
      email: user.email,
      userType: user.userType,
      credentialStatus: user.credentialStatus,
      programId: primaryAssignment?.programId ?? "",
      role: primaryAssignment?.role ?? ""
    });
    setAssignmentDrafts(
      user.userType === "admin"
        ? []
        : user.assignments.map((assignment) => ({
            programId: assignment.programId,
            programName: assignment.programName,
            role: assignment.role,
            isPrimary: assignment.isPrimary
          }))
    );
    setExpandedUsers((current) => ({ ...current, [user.id]: true }));
    setSaveState("idle");
    setStatusTone("neutral");
    setStatus(`${user.name} is loaded for access editing. Save changes to apply updates.`);
  }

  function updateProgram(programId: string) {
    const nextProgram = programs.find((program) => program.id === programId);
    const roles = getProgramRoles(nextProgram);
    setForm((current) => ({
      ...current,
      programId,
      role: roles.includes(current.role) ? current.role : roles[0] ?? ""
    }));
    setSaveState("idle");
    setNewProgramRole("");
    setRoleSaveState("idle");
    setRoleStatus(null);
  }

  function addAssignmentDraft() {
    if (!programAssignmentRequired || !selectedProgram || !form.programId || !form.role) return;
    const nextAssignment: AssignmentDraft = {
      programId: form.programId,
      programName: selectedProgram.intake.programName,
      role: form.role,
      isPrimary: assignmentDrafts.length === 0
    };

    setAssignmentDrafts((current) => {
      const key = getAssignmentDraftKey(nextAssignment);
      if (current.some((assignment) => getAssignmentDraftKey(assignment) === key)) return current;
      return [...current, nextAssignment];
    });
    setSaveState("idle");
  }

  function removeAssignmentDraft(assignmentKey: string) {
    setAssignmentDrafts((current) => {
      const nextAssignments = current.filter((assignment) => getAssignmentDraftKey(assignment) !== assignmentKey);
      if (nextAssignments.some((assignment) => assignment.isPrimary)) return nextAssignments;
      return nextAssignments.map((assignment, index) => ({ ...assignment, isPrimary: index === 0 }));
    });
    setSaveState("idle");
  }

  function makePrimaryAssignmentDraft(assignmentKey: string) {
    setAssignmentDrafts((current) =>
      current.map((assignment) => ({
        ...assignment,
        isPrimary: getAssignmentDraftKey(assignment) === assignmentKey
      }))
    );
    setSaveState("idle");
  }

  function getAssignmentInputs(): ManagedProgramAssignmentInput[] {
    if (!programAssignmentRequired) return [];
    const hasPrimary = assignmentDrafts.some((assignment) => assignment.isPrimary);
    return assignmentDrafts.map((assignment, index) => ({
      programId: assignment.programId,
      programName: assignment.programName,
      role: assignment.role,
      isPrimary: hasPrimary ? assignment.isPrimary : index === 0
    }));
  }

  async function saveUser(sendInvite: boolean) {
    setSaveAction(sendInvite ? "invite" : "save");
    setSaveState("saving");
    setStatus(null);
    setStatusTone("neutral");

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: form.id || undefined,
        name: form.name,
        email: form.email,
        userType: form.userType,
        credentialStatus: form.credentialStatus,
        sendInvite,
        assignments: getAssignmentInputs(),
        replaceAssignments: isEditingUser
      })
    });

    const payload = (await response.json()) as {
      invitation?: { ok: true; invitedAt: string } | { ok: false; error: string } | null;
      invitationProvider?: InvitationProviderStatus;
      user?: ManagedAppUser;
      error?: string;
    };
    if (!response.ok || !payload.user) {
      throw new Error(payload.error ?? "Could not save user.");
    }

    if (payload.invitationProvider) {
      setInvitationProvider(payload.invitationProvider);
    }

    return {
      invitation: payload.invitation,
      user: payload.user
    };
  }

  async function addProgramRole() {
    if (!selectedProgram) {
      setRoleSaveState("error");
      setRoleStatus("Select a program before adding a role.");
      return;
    }

    const role = newProgramRole.trim();
    if (!role) {
      setRoleSaveState("error");
      setRoleStatus("Enter a role name before adding it to the program.");
      return;
    }

    setRoleSaveState("saving");
    setRoleStatus(`Adding ${role} and refreshing guided plans...`);

    try {
      const response = await fetch(`/api/admin/programs/${selectedProgram.id}/roles`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role })
      });
      const payload = (await response.json()) as {
        error?: string;
        program?: StoredProgram;
        refreshedAt?: string;
        role?: string;
      };

      if (!response.ok || !payload.program || !payload.role) {
        throw new Error(payload.error ?? "Could not add role.");
      }
      const savedProgram = payload.program;
      const savedRole = payload.role;

      setPrograms((current) => [savedProgram, ...current.filter((program) => program.id !== savedProgram.id)]);
      setForm((current) => ({
        ...current,
        programId: savedProgram.id,
        role: savedRole
      }));
      setNewProgramRole("");
      setRoleSaveState("saved");
      setRoleStatus(
        `${savedRole} was added to ${savedProgram.intake.programName}. Guidance refreshed${
          payload.refreshedAt ? ` ${formatDate(payload.refreshedAt)}` : ""
        }.`
      );
      setStatusTone("success");
      setStatus(`${savedRole} was added and the guided plan was refreshed for ${savedProgram.intake.programName}.`);
    } catch (error) {
      setRoleSaveState("error");
      setRoleStatus(error instanceof Error ? error.message : "Could not add role and refresh guidance.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const submitter = (event.nativeEvent as SubmitEvent).submitter;
      const sendInvite = submitter instanceof HTMLButtonElement && submitter.value === "invite";
      const wasEditing = isEditingUser;
      const { invitation, user: savedUser } = await saveUser(sendInvite);

      setUsers((current) => [savedUser, ...current.filter((user) => user.id !== savedUser.id)]);
      setExpandedUsers((current) => ({ ...current, [savedUser.id]: true }));
      setForm((current) => ({
        ...emptyForm,
        programId: current.programId,
        role: current.role
      }));
      setAssignmentDrafts([]);
      setSaveState("saved");
      if (invitation?.ok) {
        setStatusTone("success");
        setStatus(
          savedUser.userType === "admin"
            ? `${savedUser.name} was ${wasEditing ? "updated" : "saved"} with Admin access and an account setup invite was sent.`
            : `${savedUser.name} was ${wasEditing ? "updated" : "saved"} with ${savedUser.assignments.length} program role assignment${
                savedUser.assignments.length === 1 ? "" : "s"
              } and an account setup invite was sent.`
        );
      } else if (invitation && !invitation.ok) {
        setStatusTone("error");
        setStatus(`${savedUser.name} was saved, but the invite was not sent: ${invitation.error}`);
      } else {
        setStatusTone("success");
        setStatus(
          savedUser.userType === "admin"
            ? `${savedUser.name} was ${wasEditing ? "updated" : "saved"} with Admin access to all programs.`
            : `${savedUser.name} was ${wasEditing ? "updated" : "saved"} with ${savedUser.assignments.length} role-specific program assignment${
                savedUser.assignments.length === 1 ? "" : "s"
              }.`
        );
      }
    } catch (error) {
      setSaveState("error");
      setStatusTone("error");
      setStatus(error instanceof Error ? error.message : "Could not save user.");
    }
  }

  async function removeManagedUser(user: ManagedAppUser) {
    const confirmed = window.confirm(
      `Remove ${user.name} from North Star? This also removes their linked login account when Supabase Auth is connected.`
    );

    if (!confirmed) return;

    setDeletingUserId(user.id);
    setStatusTone("neutral");
    setStatus(`Removing ${user.name}...`);

    try {
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: user.id })
      });
      const payload = (await response.json()) as {
        authDeletion?: { deleted: boolean; skipped: boolean };
        error?: string;
        invitationProvider?: InvitationProviderStatus;
        user?: ManagedAppUser;
      };

      if (!response.ok || !payload.user) {
        throw new Error(payload.error ?? "Could not remove user.");
      }

      if (payload.invitationProvider) {
        setInvitationProvider(payload.invitationProvider);
      }

      setUsers((current) => current.filter((item) => item.id !== payload.user?.id));
      setExpandedUsers((current) => {
        const nextExpandedUsers = { ...current };
        delete nextExpandedUsers[user.id];
        return nextExpandedUsers;
      });

      if (form.id === user.id) {
        setForm((current) => ({
          ...emptyForm,
          programId: current.programId,
          role: current.role
        }));
        setAssignmentDrafts([]);
        setSaveState("idle");
      }

      setStatusTone("success");
      setStatus(
        payload.authDeletion?.deleted
          ? `${payload.user.name} was removed from Admin and their linked login account was deleted. You can send a fresh invite to this email.`
          : payload.authDeletion?.skipped
            ? `${payload.user.name} was removed from Admin. Supabase Auth cleanup was skipped because service-role access is not configured.`
            : `${payload.user.name} was removed from Admin. No linked login account was found.`
      );
    } catch (error) {
      setStatusTone("error");
      setStatus(error instanceof Error ? error.message : "Could not remove user.");
    } finally {
      setDeletingUserId(null);
    }
  }

  return (
    <Card className="bg-zinc-950/80">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="flex items-center gap-2 text-zinc-50">
          <UsersRound className="h-4 w-4 text-emerald-200" />
          User access and program roles
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5 p-5">
        {status ? (
          <div
            className={`rounded-md border p-3 text-sm leading-6 ${
              statusTone === "error"
                ? "border-amber-300/25 bg-amber-300/[0.065] text-amber-100"
                : statusTone === "success"
                  ? "border-emerald-300/25 bg-emerald-300/[0.065] text-emerald-100"
                  : "border-white/10 bg-white/[0.035] text-zinc-400"
            }`}
            aria-live="polite"
          >
            {statusTone === "success" ? <CheckCircle2 className="mr-2 inline h-4 w-4" /> : null}
            {status}
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(20rem,0.65fr)]">
          <div className="grid gap-4">
          <form onSubmit={handleSubmit} className="grid gap-4 rounded-md border border-white/10 bg-white/[0.035] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-zinc-100">
                  {isEditingUser ? `Edit access for ${editingUser?.name ?? form.name}` : "Add user or role assignment"}
                </p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  {isEditingUser
                    ? "Update the user profile, remove stale assignments, add new program-role access, and choose the default role."
                    : "Admin users get all-program access. Scoped users can carry different roles across programs, which drives their default role-focused views."}
                </p>
              </div>
              {isEditingUser ? (
                <Button type="button" variant="outline" onClick={resetUserForm}>
                  <XCircle className="h-4 w-4" />
                  Cancel edit
                </Button>
              ) : null}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">Name</span>
                <input
                  value={form.name}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, name: event.target.value }));
                    setSaveState("idle");
                  }}
                  placeholder="Full name"
                  className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-300/50"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">Email</span>
                <input
                  value={form.email}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, email: event.target.value }));
                    setSaveState("idle");
                  }}
                  placeholder="name@company.com"
                  type="email"
                  className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-300/50"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">User type</span>
                <select
                  value={form.userType}
                  onChange={(event) => {
                    const userType = event.target.value as AppUserType;
                    setForm((current) => ({
                      ...current,
                      userType,
                      role: isProgramScopedUserType(userType) ? current.role : ""
                    }));
                    if (!isProgramScopedUserType(userType)) {
                      setAssignmentDrafts([]);
                    }
                    setSaveState("idle");
                  }}
                  className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-300/50"
                >
                  {appUserTypes.map((type) => (
                    <option key={type} value={type}>
                      {userTypeLabels[type]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">Credential status</span>
                <select
                  value={form.credentialStatus}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, credentialStatus: event.target.value as AppUserCredentialStatus }));
                    setSaveState("idle");
                  }}
                  className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-300/50"
                >
                  {appUserCredentialStatuses.map((statusValue) => (
                    <option key={statusValue} value={statusValue}>
                      {credentialStatusLabels[statusValue]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">Program</span>
                <select
                  data-admin-program-select
                  value={form.programId}
                  onChange={(event) => updateProgram(event.target.value)}
                  className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-300/50"
                >
                  <option value="">Select program...</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.intake.programName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">Program role</span>
                <select
                  data-admin-role-select
                  value={programAssignmentRequired ? form.role : ""}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, role: event.target.value }));
                    setSaveState("idle");
                  }}
                  disabled={!form.programId || !programAssignmentRequired}
                  className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors disabled:text-zinc-500 focus:border-emerald-300/50"
                >
                  <option value="">{programAssignmentRequired ? "Select role..." : "Admin all-program access"}</option>
                  {availableRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-3 rounded-md border border-white/10 bg-black/20 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-zinc-100">Program access</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Add every program-role pair this user should carry. The default role opens first in role-aware views.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addAssignmentDraft}
                  disabled={!canAddAssignmentDraft}
                >
                  <PlusCircle className="h-4 w-4" />
                  Add access
                </Button>
              </div>

              {!programAssignmentRequired ? (
                <p className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.055] p-3 text-sm leading-6 text-emerald-100">
                  Admin users have ultimate access and visibility across every program. A program role assignment is not required.
                </p>
              ) : assignmentDrafts.length ? (
                <div className="grid gap-2">
                  {assignmentDrafts.map((assignment) => {
                    const assignmentKey = getAssignmentDraftKey(assignment);

                    return (
                      <div
                        key={assignmentKey}
                        className="grid gap-3 rounded-md border border-white/10 bg-zinc-950 p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-medium text-zinc-100">{assignment.role}</p>
                            {assignment.isPrimary ? (
                              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.055] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-emerald-100">
                                Default
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 truncate text-xs text-zinc-500">{assignment.programName}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => makePrimaryAssignmentDraft(assignmentKey)}
                            disabled={assignment.isPrimary}
                          >
                            Make default
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => removeAssignmentDraft(assignmentKey)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-md border border-amber-300/20 bg-amber-300/[0.055] p-3 text-sm leading-6 text-amber-100">
                  Scoped users need at least one program access assignment before saving.
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
              <p className="text-xs leading-5 text-zinc-500">
                {invitationProvider?.configured
                  ? invitationProvider.emailDelivery === "north-star-branded"
                    ? "Invites use the branded North Star email and Supabase Auth. No plaintext passwords are stored here."
                    : "Invites are sent through Supabase Auth. No plaintext passwords are stored here."
                  : "Supabase service-role invitations are not configured. Users can still be mapped for role-aware UI defaults."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" name="intent" value="save" variant="outline" disabled={saveState === "saving" || !canSaveUser}>
                  {saveState === "saving" && saveAction === "save" ? "Saving..." : isEditingUser ? "Save changes" : "Save draft"}
                </Button>
                <Button type="submit" name="intent" value="invite" disabled={saveState === "saving" || !canSaveUser || !invitationProvider?.configured}>
                  <UserPlus className="h-4 w-4" />
                  {saveState === "saving" && saveAction === "invite" ? "Sending..." : isEditingUser ? "Save and invite again" : "Save and invite"}
                </Button>
              </div>
            </div>
          </form>

          <div className="grid gap-4 rounded-md border border-cyan-300/20 bg-cyan-300/[0.04] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-zinc-100">
                  <PlusCircle className="h-4 w-4 text-cyan-200" />
                  Program role coverage
                </p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Add roles to the selected program. Saving a new role refreshes guided plans with the updated team composition.
                </p>
              </div>
              <span
                data-admin-role-coverage
                className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-300"
              >
                {selectedProgram ? `${availableRoles.length} roles` : "No program"}
              </span>
            </div>

            {selectedProgram ? (
              <div className="flex flex-wrap gap-2">
                {availableRoles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-zinc-300"
                  >
                    {role}
                  </span>
                ))}
              </div>
            ) : (
              <p className="rounded-md border border-white/10 bg-black/20 p-3 text-sm leading-6 text-zinc-400">
                Select a program above to manage its roles.
              </p>
            )}

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">New program role</span>
                <input
                  value={newProgramRole}
                  onChange={(event) => {
                    setNewProgramRole(event.target.value);
                    setRoleSaveState("idle");
                    setRoleStatus(null);
                  }}
                  placeholder="Scrum Master, QA Lead, Security Lead..."
                  disabled={!selectedProgram || roleSaveState === "saving"}
                  className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 disabled:text-zinc-600 focus:border-cyan-300/50"
                />
              </label>
              <Button type="button" onClick={() => void addProgramRole()} disabled={!canAddProgramRole}>
                {roleSaveState === "saving" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                {roleSaveState === "saving" ? "Refreshing..." : "Add role"}
              </Button>
            </div>

            {roleStatus ? (
              <div
                aria-live="polite"
                className={`rounded-md border p-3 text-sm leading-6 ${
                  roleSaveState === "error"
                    ? "border-amber-300/25 bg-amber-300/[0.065] text-amber-100"
                    : roleSaveState === "saved"
                      ? "border-emerald-300/25 bg-emerald-300/[0.065] text-emerald-100"
                      : "border-white/10 bg-black/20 text-zinc-400"
                }`}
              >
                {roleSaveState === "saved" ? <CheckCircle2 className="mr-2 inline h-4 w-4" /> : null}
                {roleStatus}
              </div>
            ) : null}
          </div>
          </div>

          <div className="grid content-start gap-3 rounded-md border border-emerald-300/20 bg-emerald-300/[0.055] p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-100">
              <ShieldCheck className="h-4 w-4" />
              Access model
            </p>
            <p className="text-sm leading-6 text-zinc-300">
              Admin is now the protected surface for model governance and role-based user setup. Admin users have all-program visibility, while scoped user types use program assignments to shape role-aware views.
            </p>
            <div className="grid gap-2">
              {appUserTypes.map((type) => (
                <div key={type} className="rounded-md border border-white/10 bg-black/20 p-3">
                  <p className="text-sm font-medium text-zinc-100">{userTypeLabels[type]}</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    {type === "admin"
                      ? "Has ultimate access across users, programs, costs, model fit, and disputed guidance."
                      : type === "leadership"
                        ? "Reviews sponsor-level signals and role lanes relevant to their program scope."
                        : type === "delivery-lead"
                          ? "Owns the program cockpit, team signals, and plan execution loop."
                          : type === "team-member"
                            ? "Updates assigned role signals and can inspect adjacent team context."
                            : type === "client"
                              ? "Uses the external Client Portal to review assigned program and portfolio posture."
                              : "Reads assigned program context without changing program records."}
                  </p>
                </div>
              ))}
            </div>

            <div
              className={`rounded-md border p-3 ${
                brandedEmailActive
                  ? "border-emerald-300/25 bg-emerald-300/[0.075]"
                  : "border-amber-300/25 bg-amber-300/[0.07]"
              }`}
            >
              <p
                className={`flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] ${
                  brandedEmailActive ? "text-emerald-100" : "text-amber-100"
                }`}
              >
                {brandedEmailActive ? <MailCheck className="h-4 w-4" /> : <MailWarning className="h-4 w-4" />}
                Email delivery
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                {brandedEmailActive
                  ? "Branded North Star invites and recovery emails are active in this environment."
                  : invitationProvider?.configured
                    ? "Supabase default emails are active. Add the Resend env vars in Vercel to turn on branded North Star invites and recovery emails."
                    : "Supabase invitations are not configured yet, so Admin can map users but cannot send account setup emails."}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-zinc-100">Managed users</p>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.14em] text-zinc-400">
              {users.length} users
            </span>
          </div>

          {users.length ? (
            <div className="grid gap-3">
              {users.map((user) => {
                const primaryAssignment = getPrimaryAssignment(user.assignments);
                const hasGlobalAdminAccess = user.userType === "admin";
                const expanded = expandedUsers[user.id] ?? false;
                const otherAssignments = user.assignments.filter((assignment) => assignment.id !== primaryAssignment?.id);

                return (
                  <div key={user.id} className="rounded-md border border-white/10 bg-white/[0.035] p-4">
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-zinc-100">{user.name}</p>
                          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.055] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-cyan-100">
                            {userTypeLabels[user.userType]}
                          </span>
                          <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-zinc-300">
                            {credentialStatusLabels[user.credentialStatus]}
                          </span>
                          {user.authUserId ? (
                            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.055] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-emerald-100">
                              Auth linked
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate text-sm text-zinc-500">{user.email}</p>
                        {user.invitationError ? (
                          <p className="mt-2 text-xs leading-5 text-amber-200">Invite issue: {user.invitationError}</p>
                        ) : user.invitedAt ? (
                          <p className="mt-2 text-xs leading-5 text-zinc-500">Invited {formatDate(user.invitedAt)}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <p className="text-xs text-zinc-500">Updated {formatDate(user.updatedAt)}</p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => editUserAccess(user)}
                          disabled={saveState === "saving" || deletingUserId === user.id}
                          className={form.id === user.id ? "border-emerald-300/40 bg-emerald-300/[0.08] text-emerald-100" : undefined}
                        >
                          <Pencil className="h-4 w-4" />
                          {form.id === user.id ? "Editing" : "Edit access"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void removeManagedUser(user)}
                          disabled={deletingUserId === user.id}
                          className="border-rose-300/25 text-rose-100 hover:border-rose-300/45 hover:bg-rose-300/[0.08]"
                        >
                          {deletingUserId === user.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          {deletingUserId === user.id ? "Removing..." : "Remove user"}
                        </Button>
                      </div>
                    </div>

                    {hasGlobalAdminAccess ? (
                      <div className="mt-4 rounded-md border border-emerald-300/20 bg-emerald-300/[0.055] p-3">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-200">All-program access</p>
                        <p className="mt-2 text-sm font-medium text-zinc-100">Admin visibility across every program</p>
                        <p className="mt-1 text-xs leading-5 text-zinc-500">
                          Admin users are not constrained by a program role assignment.
                        </p>
                      </div>
                    ) : primaryAssignment ? (
                      <div className="mt-4 rounded-md border border-emerald-300/20 bg-emerald-300/[0.055] p-3">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-200">Default expanded role</p>
                        <p className="mt-2 text-sm font-medium text-zinc-100">
                          {primaryAssignment.role} on {primaryAssignment.programName}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-zinc-500">
                          Role-specific UI should open this lane first while keeping adjacent program context available.
                        </p>
                      </div>
                    ) : (
                      <p className="mt-4 rounded-md border border-white/10 bg-black/20 p-3 text-sm leading-6 text-zinc-400">
                        No program role assignments yet.
                      </p>
                    )}

                    {!hasGlobalAdminAccess && otherAssignments.length ? (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => setExpandedUsers((current) => ({ ...current, [user.id]: !expanded }))}
                          className="flex w-full items-center justify-between gap-3 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-left text-sm text-zinc-300 transition-colors hover:border-emerald-300/25 hover:text-zinc-100"
                        >
                          <span>{expanded ? "Hide" : "Show"} other program roles</span>
                          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
                        </button>
                        {expanded ? (
                          <div className="mt-3 grid gap-2 md:grid-cols-2">
                            {otherAssignments.map((assignment) => (
                              <div key={assignment.id} className="rounded-md border border-white/10 bg-black/20 p-3">
                                <p className="text-sm font-medium text-zinc-100">{assignment.role}</p>
                                <p className="mt-1 text-xs leading-5 text-zinc-500">{assignment.programName}</p>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="rounded-md border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-zinc-400">
              No managed users yet. Add a user above to start building role-aware access.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
