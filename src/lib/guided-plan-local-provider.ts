import { generateLocalGuidedPlan } from "@/lib/guided-plan-generator";
import type { GuidedPlanProvider } from "@/lib/guided-plan-service";

export const localGuidedPlanProvider: GuidedPlanProvider = {
  id: "local",
  async generatePlan(context) {
    return generateLocalGuidedPlan(context.program, context.updates, context.leadershipFeedbacks);
  }
};
