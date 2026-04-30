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
  "Fresh Inputs Driving This Plan",
  "Guide Dialogue Shaping This Plan",
  "Signal From Noise",
  "Recommended Work Path",
  "Planning Approach",
  "Key Outcomes",
  "Risks And Decisions",
  "What Changed From Leadership Signal",
  "Key Questions and Considerations"
]);
const sectionGroups = [
  {
    title: "Inputs",
    description: "What changed or informed the refresh.",
    sections: ["Fresh Inputs Driving This Plan", "Guide Dialogue Shaping This Plan"]
  },
  {
    title: "Execution",
    description: "What the team should do next.",
    sections: ["Signal From Noise", "Recommended Work Path", "Planning Approach", "What Changed From Leadership Signal"]
  },
  {
    title: "Outcomes",
    description: "What the plan is protecting and producing.",
    sections: ["Key Outcomes", "Critical Requirements", "Key Outputs"]
  },
  {
    title: "Decisions",
    description: "What needs attention, ownership, or clarification.",
    sections: ["Risks And Decisions", "Key Questions and Considerations"]
  }
] as const;

const sectionToneStyles: Record<
  string,
  {
    badgeClassName: string;
    cardClassName: string;
    iconClassName: string;
  }
> = {
  inputs: {
    badgeClassName: "border-cyan-200/20 text-cyan-100",
    cardClassName: "border-cyan-300/15 bg-cyan-300/[0.045]",
    iconClassName: "text-cyan-200"
  },
  execution: {
    badgeClassName: "border-emerald-200/20 text-emerald-100",
    cardClassName: "border-emerald-300/15 bg-emerald-300/[0.045]",
    iconClassName: "text-emerald-200"
  },
  outcomes: {
    badgeClassName: "border-amber-200/20 text-amber-100",
    cardClassName: "border-amber-300/15 bg-amber-300/[0.045]",
    iconClassName: "text-amber-200"
  },
  decisions: {
    badgeClassName: "border-rose-200/20 text-rose-100",
    cardClassName: "border-rose-300/15 bg-rose-300/[0.045]",
    iconClassName: "text-rose-200"
  }
};

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

function shortenInsight(value: string, maxLength = 130) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) return normalized;

  const sentenceBreak = normalized.slice(0, maxLength).lastIndexOf(". ");
  const wordBreak = normalized.lastIndexOf(" ", maxLength);
  const breakPoint = sentenceBreak > 80 ? sentenceBreak + 1 : wordBreak > 80 ? wordBreak : maxLength;

  return `${normalized.slice(0, breakPoint).trim()}...`;
}

function getSectionGroup(sectionTitle: string) {
  const group = sectionGroups.find((item) => (item.sections as readonly string[]).includes(sectionTitle));

  if (group?.title === "Inputs") return "inputs";
  if (group?.title === "Outcomes") return "outcomes";
  if (group?.title === "Decisions") return "decisions";
  return "execution";
}

function getInsightLabel(sectionTitle: string) {
  if (sectionTitle === "Fresh Inputs Driving This Plan") return "Inputs";
  if (sectionTitle === "Guide Dialogue Shaping This Plan") return "Guide";
  if (sectionTitle === "Signal From Noise") return "Signal";
  if (sectionTitle === "Recommended Work Path") return "Next Move";
  if (sectionTitle === "Planning Approach") return "Approach";
  if (sectionTitle === "Key Outcomes") return "Outcomes";
  if (sectionTitle === "Risks And Decisions") return "Risks";
  if (sectionTitle === "What Changed From Leadership Signal") return "Leadership";
  if (sectionTitle === "Key Questions and Considerations") return "Questions";
  return "Detail";
}

function CompactInsightTile({ section }: { section: GuidedPlanSection }) {
  const groupKey = getSectionGroup(section.title);
  const styles = sectionToneStyles[groupKey];
  const primaryInsight = shortenInsight(section.items[0] ?? "No signal is available yet.");
  const hiddenCount = Math.max(section.items.length - 1, 0);

  return (
    <div className={`grid min-h-full gap-3 rounded-md border p-4 ${styles.cardClassName}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-400">{section.title}</p>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] ${styles.badgeClassName}`}>
          {getInsightLabel(section.title)}
        </span>
      </div>
      <p className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 text-sm leading-6 text-zinc-200">
        <ArrowRight className={`mt-1 h-4 w-4 shrink-0 ${styles.iconClassName}`} />
        <span>{primaryInsight}</span>
      </p>
      {hiddenCount ? (
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
          + {hiddenCount} more signal{hiddenCount === 1 ? "" : "s"} in detail
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
  const preview = shortenInsight(section.items[0] ?? "No detail is available yet.", 110);

  return (
    <details className="group rounded-md border border-white/10 bg-white/[0.035] p-3">
      <summary className="grid cursor-pointer list-none gap-2 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_auto] sm:items-center">
        <span className="text-sm font-semibold text-zinc-100">{section.title}</span>
        <span className="text-xs leading-5 text-zinc-500 line-clamp-2">{preview}</span>
        <span className="w-fit rounded-full border border-white/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
          {section.items.length}
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
  const visibleGroups = sectionGroups
    .map((group) => ({
      ...group,
      matchingSections: sections.filter((section) => (group.sections as readonly string[]).includes(section.title))
    }))
    .filter((group) => group.matchingSections.length);
  const unmatchedSections = sections.filter(
    (section) => !sectionGroups.some((group) => (group.sections as readonly string[]).includes(section.title))
  );

  return (
    <Card className="bg-zinc-950/75 lg:col-span-2">
      <CardHeader className="border-b border-white/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-zinc-50">Plan Insight Digest</CardTitle>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              A concise readout of what changed, what matters, and what needs a decision.
            </p>
          </div>
          <span className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-1 text-xs text-zinc-400">
            {sections.length} sections
          </span>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {primarySections.map((section) => (
            <CompactInsightTile key={section.title} section={section} />
          ))}
        </div>

        {visibleGroups.length ? (
          <div className="grid gap-3 rounded-md border border-white/10 bg-black/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-100">Drilldown Detail</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Expand only the area you need to inspect.
                </p>
              </div>
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                Grouped detail
              </span>
            </div>
            <div className="grid gap-3">
              {visibleGroups.map((group) => (
                <details key={group.title} className="rounded-md border border-white/10 bg-white/[0.025] p-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <span>
                      <span className="block text-sm font-semibold text-zinc-100">{group.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-zinc-500">{group.description}</span>
                    </span>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                      {group.matchingSections.length}
                    </span>
                  </summary>
                  <div className="mt-3 grid gap-2 border-t border-white/10 pt-3">
                    {group.matchingSections.map((section) => (
                      <DetailSection key={section.title} section={section} footer={sectionFooters?.[section.title]} />
                    ))}
                  </div>
                </details>
              ))}
              {unmatchedSections.map((section) => (
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
