"use client";

import type { ReactNode } from "react";
import { ArrowRight, ChevronDown, ChevronUp, Flag } from "lucide-react";
import type { GuidedPlanRolePlans, GuidedPlanSection } from "@/lib/guided-plan-types";
import type { GuidanceFeedbackFlagTargetType } from "@/lib/program-intelligence-types";
import { buildTeamActionPlanFlagSourceId } from "@/lib/guidance-feedback-flag-sources";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GuidanceFlagForm } from "@/components/guidance-flag-form";

const allRolesOption = "__all_roles__";

function normalizeRoleKey(role: string) {
  return role.trim().toLowerCase();
}

type FlagTarget = {
  justificationId: string;
  citationId?: string;
  targetType?: GuidanceFeedbackFlagTargetType;
  targetLabel?: string;
  targetRole?: string;
  scope: "partial" | "whole";
};

export function PlanSectionCard({
  section,
  footer
}: {
  section: GuidedPlanSection;
  footer?: ReactNode;
}) {
  return (
    <Card className="bg-zinc-950/75">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="text-zinc-50">{section.title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 p-5">
        {section.items.map((item) => (
          <p key={item} className="flex gap-2 rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-sm leading-6 text-zinc-300">
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-emerald-200" />
            {item}
          </p>
        ))}
        {footer}
      </CardContent>
    </Card>
  );
}

export function RolePlansCard({
  rolePlans,
  selectedRoleFocus,
  expandedRoleKeys,
  canFlagGuidance,
  flagTarget,
  flagReason,
  flagContext,
  isSubmittingFlag,
  onToggleRole,
  onOpenRoleFlag,
  onFlagReasonChange,
  onFlagContextChange,
  onSubmitFlag,
  onCancelFlag
}: {
  rolePlans: GuidedPlanRolePlans;
  selectedRoleFocus: string;
  expandedRoleKeys: Set<string>;
  canFlagGuidance: boolean;
  flagTarget: FlagTarget | null;
  flagReason: string;
  flagContext: string;
  isSubmittingFlag: boolean;
  onToggleRole: (role: string) => void;
  onOpenRoleFlag: (role: string) => void;
  onFlagReasonChange: (value: string) => void;
  onFlagContextChange: (value: string) => void;
  onSubmitFlag: () => void | Promise<void>;
  onCancelFlag: () => void;
}) {
  const sortedRoles =
    selectedRoleFocus === allRolesOption
      ? rolePlans.roles
      : [
          ...rolePlans.roles.filter((rolePlan) => normalizeRoleKey(rolePlan.role) === normalizeRoleKey(selectedRoleFocus)),
          ...rolePlans.roles.filter((rolePlan) => normalizeRoleKey(rolePlan.role) !== normalizeRoleKey(selectedRoleFocus))
        ];

  return (
    <Card className="bg-zinc-950/75 lg:col-span-2">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="text-zinc-50">{rolePlans.title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 p-5 xl:grid-cols-2">
        {sortedRoles.map((rolePlan) => {
          const isFocusedRole =
            selectedRoleFocus !== allRolesOption && normalizeRoleKey(rolePlan.role) === normalizeRoleKey(selectedRoleFocus);
          const isExpanded = selectedRoleFocus === allRolesOption || isFocusedRole || expandedRoleKeys.has(normalizeRoleKey(rolePlan.role));
          const roleFlagSourceId = buildTeamActionPlanFlagSourceId(rolePlan.role);
          const isFlagTarget = flagTarget?.citationId === roleFlagSourceId;

          return (
            <div
              key={rolePlan.role}
              className={`rounded-md border bg-white/[0.035] p-4 ${isFocusedRole ? "border-cyan-300/25 xl:col-span-2" : "border-white/10"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-100">{rolePlan.role}</p>
                  {isFocusedRole ? <p className="mt-1 text-xs text-cyan-200">Focused role view</p> : null}
                </div>
                {!isFocusedRole && selectedRoleFocus !== allRolesOption ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 shrink-0 px-2 text-zinc-300 hover:text-zinc-50"
                    onClick={() => onToggleRole(rolePlan.role)}
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                ) : null}
              </div>
              {isExpanded ? (
                <div className="mt-4 grid gap-4">
                  <div className="grid gap-2">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">Action Plan</p>
                    {rolePlan.actionPlan.map((item) => (
                      <p key={item} className="flex gap-2 text-sm leading-6 text-zinc-300">
                        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-cyan-200" />
                        {item}
                      </p>
                    ))}
                  </div>
                  <div className="grid gap-2">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-emerald-200">Key Focus Areas</p>
                    {rolePlan.keyFocusAreas.map((item) => (
                      <p key={item} className="flex gap-2 text-sm leading-6 text-zinc-300">
                        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-emerald-200" />
                        {item}
                      </p>
                    ))}
                  </div>
                  <div className="grid gap-2">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-amber-200">Key Outcomes</p>
                    {rolePlan.keyOutcomes.map((item) => (
                      <p key={item} className="flex gap-2 text-sm leading-6 text-zinc-300">
                        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-amber-200" />
                        {item}
                      </p>
                    ))}
                  </div>
                  <div className="grid gap-2">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-rose-200">Risk / Mitigation</p>
                    {rolePlan.risksAndMitigations.map((item) => (
                      <p key={item} className="flex gap-2 text-sm leading-6 text-zinc-300">
                        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-rose-200" />
                        {item}
                      </p>
                    ))}
                  </div>
                  <div className="flex justify-end border-t border-white/10 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canFlagGuidance}
                      onClick={() => onOpenRoleFlag(rolePlan.role)}
                    >
                      <Flag className="h-4 w-4" />
                      Flag guidance
                    </Button>
                  </div>
                  {isFlagTarget ? (
                    <GuidanceFlagForm
                      reason={flagReason}
                      context={flagContext}
                      isSubmitting={isSubmittingFlag}
                      reasonPlaceholder={`What feels inaccurate or misaligned for ${rolePlan.role}?`}
                      contextPlaceholder="Add the role-specific context governance should consider before accepting or denying this dispute."
                      onReasonChange={onFlagReasonChange}
                      onContextChange={onFlagContextChange}
                      onSubmit={onSubmitFlag}
                      onCancel={onCancelFlag}
                    />
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  Expand this role to view its action plan, focus areas, outcomes, and mitigations.
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
