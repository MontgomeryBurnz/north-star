"use client";

import { useMemo, type ReactNode } from "react";
import { ArrowRight, ChevronDown, ChevronUp, Flag } from "lucide-react";
import type { GuidedPlanRolePlan, GuidedPlanRolePlans, GuidedPlanSection } from "@/lib/guided-plan-types";
import type { GuidanceFeedbackFlagTargetType } from "@/lib/program-intelligence-types";
import { buildTeamActionPlanFlagSourceId } from "@/lib/guidance-feedback-flag-sources";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GuidanceFlagForm } from "@/components/guidance-flag-form";

const allRolesOption = "__all_roles__";
const primaryInsightTitles = new Set([
  "Signal From Noise",
  "Recommended Work Path",
  "Risks And Decisions",
  "What Changed From Leadership Signal"
]);

function normalizeRoleKey(role: string) {
  return role.trim().toLowerCase();
}

const rolePlanGroupStyles = {
  actionPlan: {
    title: "Action Plan",
    className: "text-cyan-200",
    iconClassName: "text-cyan-200"
  },
  keyFocusAreas: {
    title: "Key Focus Areas",
    className: "text-emerald-200",
    iconClassName: "text-emerald-200"
  },
  keyOutcomes: {
    title: "Key Outcomes",
    className: "text-amber-200",
    iconClassName: "text-amber-200"
  },
  risksAndMitigations: {
    title: "Risk / Mitigation",
    className: "text-rose-200",
    iconClassName: "text-rose-200"
  }
} as const;

type FlagTarget = {
  justificationId: string;
  citationId?: string;
  targetType?: GuidanceFeedbackFlagTargetType;
  targetLabel?: string;
  targetRole?: string;
  scope: "partial" | "whole";
};

function RolePlanSignalGroup({
  className,
  iconClassName,
  items,
  title
}: {
  className: string;
  iconClassName: string;
  items: string[];
  title: string;
}) {
  return (
    <div className="grid gap-2 rounded-md border border-white/10 bg-black/20 p-3">
      <p className={`text-[11px] font-medium uppercase tracking-[0.14em] ${className}`}>{title}</p>
      <div className="grid gap-1.5">
        {items.map((item) => (
          <p key={item} className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 text-xs leading-5 text-zinc-300">
            <ArrowRight className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${iconClassName}`} />
            <span>{item}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function InsightPreview({ items }: { items: string[] }) {
  const previewItems = items.slice(0, 2);
  const hiddenCount = Math.max(items.length - previewItems.length, 0);

  return (
    <div className="grid gap-2">
      {previewItems.map((item) => (
        <p key={item} className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 text-sm leading-6 text-zinc-300">
          <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-emerald-200" />
          <span>{item}</span>
        </p>
      ))}
      {hiddenCount ? (
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
          + {hiddenCount} more in source detail
        </p>
      ) : null}
    </div>
  );
}

function DetailSection({
  footer,
  section
}: {
  footer?: ReactNode;
  section: GuidedPlanSection;
}) {
  return (
    <details className="group rounded-md border border-white/10 bg-white/[0.035] p-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span className="text-sm font-semibold text-zinc-100">{section.title}</span>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
          {section.items.length} signal{section.items.length === 1 ? "" : "s"}
        </span>
      </summary>
      <div className="mt-3 grid gap-2 border-t border-white/10 pt-3">
        {section.items.map((item) => (
          <p key={item} className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 text-sm leading-6 text-zinc-300">
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-cyan-200" />
            <span>{item}</span>
          </p>
        ))}
        {footer}
      </div>
    </details>
  );
}

export function PlanInsightsCard({
  sectionFooters,
  sections
}: {
  sectionFooters?: Record<string, ReactNode>;
  sections: GuidedPlanSection[];
}) {
  const primarySections = sections.filter((section) => primaryInsightTitles.has(section.title));
  const supportingSections = sections.filter((section) => !primaryInsightTitles.has(section.title));
  const sectionsWithDetail = [...primarySections, ...supportingSections];

  return (
    <Card className="bg-zinc-950/75 lg:col-span-2">
      <CardHeader className="border-b border-white/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-zinc-50">Plan Insight Digest</CardTitle>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              Critical delivery signal from the latest refresh.
            </p>
          </div>
          <span className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-1 text-xs text-zinc-400">
            {sections.length} sections
          </span>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 sm:p-5">
        <div className="grid gap-3 xl:grid-cols-2">
          {primarySections.map((section) => (
            <div key={section.title} className="grid gap-3 rounded-md border border-emerald-300/15 bg-emerald-300/[0.045] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-zinc-50">{section.title}</p>
                <span className="rounded-full border border-emerald-200/20 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-emerald-100">
                  Critical
                </span>
              </div>
              <InsightPreview items={section.items} />
            </div>
          ))}
        </div>

        {supportingSections.length ? (
          <div className="grid gap-3 rounded-md border border-white/10 bg-black/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-100">Source Detail</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Evidence, outputs, and requirements supporting the current plan.
                </p>
              </div>
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                Supporting detail
              </span>
            </div>
            <div className="grid gap-2">
              {sectionsWithDetail.map((section) => (
                <DetailSection key={section.title} section={section} footer={sectionFooters?.[section.title]} />
              ))}
            </div>
          </div>
        ) : null}
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
  const selectedRoleKey = normalizeRoleKey(selectedRoleFocus);
  const sortedRoles = useMemo(() => {
    if (selectedRoleFocus === allRolesOption) return rolePlans.roles;

    const focusedRoles: GuidedPlanRolePlan[] = [];
    const otherRoles: GuidedPlanRolePlan[] = [];

    for (const rolePlan of rolePlans.roles) {
      if (normalizeRoleKey(rolePlan.role) === selectedRoleKey) {
        focusedRoles.push(rolePlan);
      } else {
        otherRoles.push(rolePlan);
      }
    }

    return [...focusedRoles, ...otherRoles];
  }, [rolePlans.roles, selectedRoleFocus, selectedRoleKey]);

  return (
    <Card className="bg-zinc-950/75 lg:col-span-2">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="text-zinc-50">{rolePlans.title}</CardTitle>
      </CardHeader>
      <CardContent className="grid items-stretch gap-3 p-4 sm:p-5 xl:grid-cols-2">
        {sortedRoles.map((rolePlan) => {
          const isFocusedRole =
            selectedRoleFocus !== allRolesOption && normalizeRoleKey(rolePlan.role) === selectedRoleKey;
          const isExpanded = selectedRoleFocus === allRolesOption || isFocusedRole || expandedRoleKeys.has(normalizeRoleKey(rolePlan.role));
          const roleFlagSourceId = buildTeamActionPlanFlagSourceId(rolePlan.role);
          const isFlagTarget = flagTarget?.citationId === roleFlagSourceId;
          const signalGroups = [
            { ...rolePlanGroupStyles.actionPlan, items: rolePlan.actionPlan },
            { ...rolePlanGroupStyles.keyFocusAreas, items: rolePlan.keyFocusAreas },
            { ...rolePlanGroupStyles.keyOutcomes, items: rolePlan.keyOutcomes },
            { ...rolePlanGroupStyles.risksAndMitigations, items: rolePlan.risksAndMitigations }
          ];

          return (
            <div
              key={rolePlan.role}
              className={`flex min-h-full flex-col rounded-md border bg-white/[0.035] p-3 sm:p-4 ${
                isFocusedRole ? "border-cyan-300/25 xl:col-span-2" : "border-white/10"
              }`}
            >
              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
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
                <div className="mt-3 flex flex-1 flex-col gap-3">
                  <div className={`grid flex-1 gap-3 ${isFocusedRole ? "md:grid-cols-2" : ""}`}>
                    {signalGroups.map((group) => (
                      <RolePlanSignalGroup
                        key={group.title}
                        className={group.className}
                        iconClassName={group.iconClassName}
                        items={group.items}
                        title={group.title}
                      />
                    ))}
                  </div>
                  <div className="mt-auto flex justify-end border-t border-white/10 pt-3">
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
