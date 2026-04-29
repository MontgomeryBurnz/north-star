import type { OpenAIUsageWorkflow } from "@/lib/program-intelligence-types";

function sanitizeMetadataValue(value: string | undefined) {
  return value?.trim().slice(0, 512) || undefined;
}

export function buildOpenAIRequestMetadata(input: {
  workflow: OpenAIUsageWorkflow;
  programId?: string;
  programName?: string;
}) {
  return {
    app: "north-star",
    environment: sanitizeMetadataValue(process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown"),
    workflow: input.workflow,
    program_id: sanitizeMetadataValue(input.programId),
    program_name: sanitizeMetadataValue(input.programName)
  };
}
