import test from "node:test";
import assert from "node:assert/strict";
import { buildLeadershipReviewQueue, buildReviewCycleStatusForCadence, deriveLeadLabel } from "../src/lib/leadership-review-queue.ts";

test("deriveLeadLabel prefers explicit program owner", () => {
  assert.equal(
    deriveLeadLabel({
      id: "program-1",
      intake: {
        programName: "Alpha",
        programOwner: "Casey Delivery Lead",
        stakeholders: "Executive sponsor, Program manager"
      }
    }),
    "Casey Delivery Lead"
  );
});

test("buildReviewCycleStatusForCadence marks missing reviews as due", () => {
  const status = buildReviewCycleStatusForCadence([], "weekly");
  assert.equal(status.badgeTone, "due");
  assert.match(status.nextReviewLabel, /Start the first weekly review/);
});

test("buildLeadershipReviewQueue prioritizes attention over due items", () => {
  const now = new Date();
  const stale = new Date(now);
  stale.setDate(stale.getDate() - 20);

  const queue = buildLeadershipReviewQueue({
    programs: [
      {
        id: "attention-program",
        intake: {
          programName: "Attention Program",
          programOwner: "Lead A",
          leadershipReviewCadence: "weekly"
        }
      },
      {
        id: "due-program",
        intake: {
          programName: "Due Program",
          programOwner: "Lead B",
          leadershipReviewCadence: "weekly"
        }
      }
    ],
    feedbackByProgramId: new Map([
      ["attention-program", [{ createdAt: now.toISOString() }]],
      ["due-program", [{ createdAt: stale.toISOString() }]]
    ]),
    updatesByProgramId: new Map([
      [
        "attention-program",
        [
          {
            review: {
              teamRoleUpdates: [{ role: "Application Development", needsLeadershipAttention: true }]
            }
          }
        ]
      ],
      ["due-program", []]
    ])
  });

  assert.equal(queue[0]?.programId, "attention-program");
  assert.equal(queue[0]?.status, "attention");
  assert.equal(queue[1]?.programId, "due-program");
});
