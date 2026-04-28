type QueueProgram = {
  id: string;
  intake: {
    programName: string;
    programOwner?: string;
    stakeholders?: string;
    leadershipReviewCadence?: ReviewCadence;
  };
};

type QueueLeadershipReviewRecord = {
  createdAt: string;
};

type QueueProgramUpdate = {
  review: {
    teamRoleUpdates?: Array<{
      role: string;
      needsLeadershipAttention: boolean;
    }>;
  };
};

export type ReviewCadence = "weekly" | "biweekly";

export type ReviewCycleStatus = {
  cadence: ReviewCadence;
  lastReviewedLabel: string;
  nextReviewLabel: string;
  badgeLabel: string;
  badgeTone: "on-track" | "due" | "overdue";
  ctaLabel: string;
  helperText: string;
};

export type ReviewQueueItem = {
  programId: string;
  programName: string;
  leadLabel: string;
  cadence: ReviewCadence;
  status: "due" | "overdue" | "attention";
  badgeLabel: string;
  lastReviewedLabel: string;
  nextReviewLabel: string;
  attentionRoles: string[];
};

function differenceInDays(later: Date, earlier: Date) {
  return Math.floor((later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24));
}

function formatRelativeDays(days: number) {
  if (days <= 0) return "today";
  if (days === 1) return "in 1 day";
  return `in ${days} days`;
}

export function deriveLeadLabel(program: QueueProgram) {
  if (program.intake.programOwner?.trim()) {
    return program.intake.programOwner.trim();
  }

  const stakeholderLines = (program.intake.stakeholders || "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

  const explicitLead =
    stakeholderLines.find((item) => /\b(delivery lead|program lead|owner|engagement lead|program manager)\b/i.test(item)) ??
    stakeholderLines[0];

  return explicitLead || "Lead not named";
}

export function getAttentionRoleUpdates(update: QueueProgramUpdate | undefined) {
  return (
    update?.review.teamRoleUpdates?.filter(
      (role) => role.needsLeadershipAttention && role.role.trim()
    ) ?? []
  );
}

export function buildReviewCycleStatusForCadence(entries: QueueLeadershipReviewRecord[], cadence: ReviewCadence): ReviewCycleStatus {
  const cadenceDays = cadence === "weekly" ? 7 : 14;

  if (!entries.length) {
    return {
      cadence,
      lastReviewedLabel: "No review on file",
      nextReviewLabel: cadence === "weekly" ? "Start the first weekly review" : "Start the first bi-weekly review",
      badgeLabel: "Review needed",
      badgeTone: "due",
      ctaLabel: "Start review cycle",
      helperText: "No leadership review has been captured yet."
    };
  }

  const latest = new Date(entries[0].createdAt);
  const now = new Date();
  const daysSinceReview = differenceInDays(now, latest);
  const daysUntilNext = cadenceDays - daysSinceReview;
  const overdue = daysUntilNext < 0;
  const due = !overdue && daysUntilNext <= 2;

  return {
    cadence,
    lastReviewedLabel: `Last reviewed ${latest.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
    nextReviewLabel: overdue
      ? `${Math.abs(daysUntilNext)} day${Math.abs(daysUntilNext) === 1 ? "" : "s"} overdue`
      : `Next review ${formatRelativeDays(daysUntilNext)}`,
    badgeLabel: overdue ? "Overdue" : due ? "Due" : "On track",
    badgeTone: overdue ? "overdue" : due ? "due" : "on-track",
    ctaLabel: overdue || due ? "Start new review cycle" : "Update this review cycle",
    helperText: overdue
      ? "The current leadership review is overdue and should be refreshed."
      : due
        ? "The current leadership review is due soon."
        : "The current leadership review is still within the expected review window."
  };
}

export function buildLeadershipReviewQueue(input: {
  programs: QueueProgram[];
  feedbackByProgramId: Map<string, QueueLeadershipReviewRecord[]>;
  updatesByProgramId: Map<string, QueueProgramUpdate[]>;
}) {
  const queueEntries = input.programs
    .map((program) => {
      const cadence = (program.intake.leadershipReviewCadence as ReviewCadence | undefined) ?? "weekly";
      const programFeedback = input.feedbackByProgramId.get(program.id) ?? [];
      const programUpdates = input.updatesByProgramId.get(program.id) ?? [];
      const cycleStatus = buildReviewCycleStatusForCadence(programFeedback, cadence);
      const attentionRoles = getAttentionRoleUpdates(programUpdates[0]).map((role) => role.role);

      if (cycleStatus.badgeTone === "on-track" && !attentionRoles.length) {
        return null;
      }

      return {
        programId: program.id,
        programName: program.intake.programName,
        leadLabel: deriveLeadLabel(program),
        cadence,
        status: cycleStatus.badgeTone !== "on-track" ? cycleStatus.badgeTone : "attention",
        badgeLabel: cycleStatus.badgeTone !== "on-track" ? cycleStatus.badgeLabel : "Leadership attention flagged",
        lastReviewedLabel: cycleStatus.lastReviewedLabel,
        nextReviewLabel: cycleStatus.nextReviewLabel,
        attentionRoles
      } satisfies ReviewQueueItem;
    })
    .filter((entry): entry is ReviewQueueItem => Boolean(entry));

  return queueEntries.sort((a, b) => {
    if (a.status !== b.status) {
      const order = { attention: 0, overdue: 1, due: 2 };
      return order[a.status] - order[b.status];
    }

    return a.programName.localeCompare(b.programName);
  });
}
