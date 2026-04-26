"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, ClipboardList, FileText, FolderUp, ListChecks, Save, ShieldAlert, Sparkles, Trash2 } from "lucide-react";
import type { ProgramArtifact, ProgramIntake, ReviewedArtifactContext } from "@/lib/program-intake-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const emptyIntake: ProgramIntake = {
  programName: "",
  vision: "",
  sowSummary: "",
  outcomes: "",
  stakeholders: "",
  risks: "",
  constraints: "",
  currentStatus: "",
  decisionsNeeded: "",
  blockers: "",
  artifacts: []
};

const emptyReviewedContext: ReviewedArtifactContext = {
  outcomes: "",
  stakeholders: "",
  risks: "",
  requirements: "",
  decisions: "",
  outputs: "",
  confidence: "low"
};

const sampleArtifactText = `Statement of Work: Customer Onboarding Modernization
Outcome: reduce onboarding cycle time, create a visible delivery path, and align sponsor decisions to measurable customer readiness.
Stakeholders: executive sponsor, delivery lead, CX operations, implementation team, customer success, compliance partner.
Requirements: define intake fields, map workflow ownership, create decision log, identify readiness criteria, and produce an executive checkpoint view.
Risks: decision ownership is unclear, implementation teams are carrying too many open questions, and requirements are spread across multiple artifacts.
Constraints: first release must use local data capture, support artifact upload, and generate a useful guided plan before OpenAI is connected.
Decision needed: confirm the minimum viable planning output and the owner for sponsor alignment.
Key outputs: recommended work path, planning approach, critical requirements, risk view, stakeholder checkpoint plan, and next-step owner map.`;

const sampleIntake: ProgramIntake = {
  programName: "Customer Onboarding Modernization",
  vision: "Create a clear delivery path that reduces onboarding ambiguity and gives leaders a reliable view of decisions, risks, and next outputs.",
  sowSummary: "Modernize the intake-to-delivery workflow for customer onboarding using structured program context, artifact evidence, and guided planning outputs.",
  outcomes: "Reduce onboarding cycle time\nCreate a visible delivery path\nImprove sponsor decision clarity\nDefine readiness criteria before expansion",
  stakeholders: "Executive sponsor\nDelivery lead\nCX operations\nImplementation team\nCustomer success\nCompliance partner",
  risks: "Decision ownership is unclear\nImplementation teams are carrying too many open questions\nRequirements are spread across multiple artifacts",
  constraints: "First release must use local data capture\nArtifact upload must support testable evidence\nGuided plans must work before OpenAI is connected",
  currentStatus: "New program context is being assembled for first guided-plan generation.",
  decisionsNeeded: "Confirm the minimum viable planning output\nName the owner for sponsor alignment",
  blockers: "Source context exists, but it needs to be translated into a clear work path.",
  reviewedContext: {
    outcomes: "Reduce onboarding cycle time\nCreate a visible delivery path\nImprove sponsor decision clarity",
    stakeholders: "Executive sponsor\nDelivery lead\nCX operations\nImplementation team\nCustomer success\nCompliance partner",
    risks: "Decision ownership is unclear\nImplementation teams are carrying too many open questions\nRequirements are spread across multiple artifacts",
    requirements: "Define intake fields\nMap workflow ownership\nCreate decision log\nIdentify readiness criteria\nProduce an executive checkpoint view",
    decisions: "Confirm the minimum viable planning output\nName the owner for sponsor alignment",
    outputs: "Recommended work path\nPlanning approach\nCritical requirements\nRisk view\nStakeholder checkpoint plan\nNext-step owner map",
    confidence: "high",
    reviewedAt: new Date(1776788559000).toISOString()
  },
  artifacts: [
    {
      id: "sample-customer-onboarding-sow",
      name: "customer-onboarding-sow.txt",
      size: sampleArtifactText.length,
      type: "text/plain",
      lastModified: 1776788559000,
      fileFormat: "txt",
      artifactType: "sow",
      sourceQuality: "semi-structured",
      analysisPriority: "high",
      sourceKind: "text",
      extractionStatus: "extracted",
      extractionMethod: "browser-text",
      extractionSummary: `${sampleArtifactText.length.toLocaleString()} characters extracted. ${sampleArtifactText.slice(0, 120)}...`,
      extractedText: sampleArtifactText
    }
  ]
};

const textFields: Array<{
  id: keyof Omit<ProgramIntake, "artifacts" | "reviewedContext">;
  label: string;
  placeholder: string;
  rows: number;
}> = [
  {
    id: "vision",
    label: "Vision / desired outcome",
    placeholder: "What needs to be true when this program is healthy?",
    rows: 4
  },
  {
    id: "sowSummary",
    label: "Plan / SoW summary",
    placeholder: "Paste the scope, assumptions, timeline, or work statement summary.",
    rows: 4
  },
  {
    id: "outcomes",
    label: "Key outcomes",
    placeholder: "List measurable outcomes, business goals, or delivery expectations.",
    rows: 3
  },
  {
    id: "stakeholders",
    label: "Stakeholders",
    placeholder: "Who is involved, who decides, who is impacted, and where alignment is needed?",
    rows: 3
  },
  {
    id: "risks",
    label: "Risks",
    placeholder: "Known risks, uncertainty, delivery pressure, quality concerns, or escalation points.",
    rows: 3
  },
  {
    id: "constraints",
    label: "Constraints",
    placeholder: "Budget, timing, staffing, compliance, dependency, or technology constraints.",
    rows: 3
  },
  {
    id: "currentStatus",
    label: "Current status",
    placeholder: "Where the program stands today. Include progress, friction, and open loops.",
    rows: 3
  },
  {
    id: "decisionsNeeded",
    label: "Decisions needed",
    placeholder: "What decisions are required to move cleanly?",
    rows: 3
  },
  {
    id: "blockers",
    label: "Blockers",
    placeholder: "What is slowing the work path down right now?",
    rows: 3
  }
];

const artifactTypeOptions: Array<{ value: NonNullable<ProgramArtifact["artifactType"]>; label: string }> = [
  { value: "sow", label: "SoW / scope" },
  { value: "project-plan", label: "Project plan" },
  { value: "status-report", label: "Status report" },
  { value: "risk-log", label: "Risk log" },
  { value: "requirements", label: "Requirements" },
  { value: "meeting-notes", label: "Meeting notes" },
  { value: "strategy-deck", label: "Strategy deck" },
  { value: "unknown", label: "Not sure yet" }
];

const sourceQualityOptions: Array<{ value: NonNullable<ProgramArtifact["sourceQuality"]>; label: string }> = [
  { value: "structured", label: "Structured" },
  { value: "semi-structured", label: "Semi-structured" },
  { value: "narrative", label: "Narrative" },
  { value: "presentation", label: "Presentation" },
  { value: "raw-notes", label: "Raw notes" },
  { value: "unknown", label: "Unknown" }
];

const analysisPriorityOptions: Array<{ value: NonNullable<ProgramArtifact["analysisPriority"]>; label: string }> = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" }
];

const reviewedContextFields: Array<{
  id: keyof Omit<ReviewedArtifactContext, "confidence" | "reviewedAt">;
  label: string;
  intakeField?: keyof Omit<ProgramIntake, "artifacts" | "reviewedContext">;
}> = [
  { id: "outcomes", label: "Outcomes", intakeField: "outcomes" },
  { id: "stakeholders", label: "Stakeholders", intakeField: "stakeholders" },
  { id: "risks", label: "Risks", intakeField: "risks" },
  { id: "requirements", label: "Critical requirements", intakeField: "constraints" },
  { id: "decisions", label: "Decisions", intakeField: "decisionsNeeded" },
  { id: "outputs", label: "Key outputs", intakeField: "sowSummary" }
];

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function splitSignals(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function isTextFile(file: File) {
  return file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");
}

function canUseServerParser(fileFormat: ProgramArtifact["fileFormat"]) {
  return fileFormat === "pdf" || fileFormat === "doc" || fileFormat === "docx" || fileFormat === "ppt" || fileFormat === "pptx";
}

function detectFileFormat(fileName: string): NonNullable<ProgramArtifact["fileFormat"]> {
  const extension = fileName.toLowerCase().split(".").pop();
  if (extension === "txt" || extension === "pdf" || extension === "doc" || extension === "docx" || extension === "ppt" || extension === "pptx") {
    return extension;
  }
  return "unknown";
}

function inferArtifactType(fileName: string): NonNullable<ProgramArtifact["artifactType"]> {
  const name = fileName.toLowerCase();
  if (name.includes("sow") || name.includes("scope") || name.includes("statement-of-work")) return "sow";
  if (name.includes("plan") || name.includes("roadmap") || name.includes("timeline")) return "project-plan";
  if (name.includes("status") || name.includes("health") || name.includes("update")) return "status-report";
  if (name.includes("risk") || name.includes("raid") || name.includes("issue")) return "risk-log";
  if (name.includes("requirement") || name.includes("capability") || name.includes("brd")) return "requirements";
  if (name.includes("note") || name.includes("minutes") || name.includes("meeting")) return "meeting-notes";
  if (name.includes("deck") || name.includes("strategy") || name.includes("exec")) return "strategy-deck";
  return "unknown";
}

function inferSourceQuality(
  fileFormat: NonNullable<ProgramArtifact["fileFormat"]>,
  artifactType: NonNullable<ProgramArtifact["artifactType"]>
): NonNullable<ProgramArtifact["sourceQuality"]> {
  if (fileFormat === "ppt" || fileFormat === "pptx" || artifactType === "strategy-deck") return "presentation";
  if (artifactType === "risk-log" || artifactType === "requirements" || artifactType === "project-plan") return "structured";
  if (artifactType === "meeting-notes") return "raw-notes";
  if (artifactType === "sow" || artifactType === "status-report") return "semi-structured";
  return "unknown";
}

function compactText(value: string, limit = 180) {
  const compacted = value.replace(/\s+/g, " ").trim();
  return compacted.length > limit ? `${compacted.slice(0, limit).trim()}...` : compacted;
}

function toTitleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function inferProgramNameFromArtifact(fileName: string) {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  const cleaned = withoutExtension
    .replace(/[_-]+/g, " ")
    .replace(/\b(brd|business requirements?|requirements?|requirement|sow|statement of work|deck|plan|status|report|draft|final|v\d+)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned ? toTitleCase(cleaned) : "";
}

function matchingLines(text: string, keywords: string[], fallbackLength = 500) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const matches = lines.filter((line) => keywords.some((keyword) => line.toLowerCase().includes(keyword))).slice(0, 5);
  return compactText((matches.length ? matches : lines).join("\n"), fallbackLength);
}

function linesForReview(text: string, keywords: string[], fallbackLength = 520) {
  return matchingLines(text, keywords, fallbackLength).replace(/\. /g, ".\n");
}

function buildPrefillFromArtifact(text: string): Partial<Omit<ProgramIntake, "artifacts" | "reviewedContext">> {
  return {
    sowSummary: compactText(text, 800),
    outcomes: matchingLines(text, ["outcome", "objective", "goal", "success", "target"], 500),
    stakeholders: matchingLines(text, ["stakeholder", "sponsor", "owner", "approver", "team"], 400),
    risks: matchingLines(text, ["risk", "issue", "concern", "threat", "exposure"], 400),
    constraints: matchingLines(text, ["constraint", "dependency", "assumption", "timeline", "budget", "scope"], 400),
    decisionsNeeded: matchingLines(text, ["decision", "approval", "approve", "signoff", "sign-off"], 400),
    blockers: matchingLines(text, ["blocker", "blocked", "impediment", "delay", "dependency"], 400)
  };
}

function getExtractedArtifactText(artifacts: ProgramArtifact[]) {
  return artifacts
    .filter(
      (artifact) =>
        (artifact.extractionStatus === "extracted" || artifact.extractionStatus === "partial") && artifact.extractedText?.trim()
    )
    .map((artifact) => artifact.extractedText)
    .join("\n");
}

function getExtractionConfidence(artifacts: ProgramArtifact[]): ReviewedArtifactContext["confidence"] {
  const extractableArtifacts = artifacts.filter((artifact) => artifact.extractionStatus === "extracted" || artifact.extractionStatus === "partial");
  if (!extractableArtifacts.length) return "low";
  if (extractableArtifacts.some((artifact) => artifact.extractionStatus === "partial")) return "medium";
  if (extractableArtifacts.some((artifact) => artifact.artifactType === "unknown" || artifact.sourceQuality === "unknown")) return "medium";
  return "high";
}

function buildReviewedContextFromArtifacts(artifacts: ProgramArtifact[]): ReviewedArtifactContext | undefined {
  const text = getExtractedArtifactText(artifacts);
  if (!text) return undefined;

  return {
    outcomes: linesForReview(text, ["outcome", "objective", "goal", "success", "target"]),
    stakeholders: linesForReview(text, ["stakeholder", "sponsor", "owner", "approver", "team"]),
    risks: linesForReview(text, ["risk", "issue", "concern", "threat", "exposure"]),
    requirements: linesForReview(text, ["requirement", "must", "criteria", "dependency", "constraint", "scope"]),
    decisions: linesForReview(text, ["decision", "approval", "approve", "signoff", "sign-off"]),
    outputs: linesForReview(text, ["output", "deliverable", "plan", "log", "view", "map"]),
    confidence: getExtractionConfidence(artifacts),
    reviewedAt: new Date().toISOString()
  };
}

export function ProgramIntakeSection() {
  const router = useRouter();
  const [intake, setIntake] = useState<ProgramIntake>(emptyIntake);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [generateState, setGenerateState] = useState<"idle" | "generating" | "error">("idle");
  const [artifactStatus, setArtifactStatus] = useState<string | null>(null);
  const [savedProgramId, setSavedProgramId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const hasProgramName = Boolean(intake.programName.trim());

  const completion = useMemo(() => {
    const values = Object.entries(intake)
      .filter(([key]) => key !== "artifacts" && key !== "reviewedContext")
      .map(([, value]) => String(value).trim());
    const completed = values.filter(Boolean).length + (intake.artifacts.length ? 1 : 0);
    return Math.round((completed / (values.length + 1)) * 100);
  }, [intake]);

  const guidancePreview = useMemo(() => {
    const riskSignals = splitSignals(intake.risks || intake.blockers);
    const outcomeSignals = splitSignals(intake.outcomes || intake.vision);
    const decisionSignals = splitSignals(intake.decisionsNeeded);

    return [
      {
        label: "Tailored guidance",
        value:
          intake.vision || intake.sowSummary
            ? "Clarify the healthiest outcome, then sequence work around the decision that unlocks it."
            : "Add vision and SoW context to generate useful guidance."
      },
      {
        label: "Key next steps",
        value: decisionSignals.length
          ? `Resolve: ${decisionSignals[0]}`
          : "Name the decision, owner, and next checkpoint."
      },
      {
        label: "Critical requirements",
        value: outcomeSignals.length
          ? `Anchor requirements to: ${outcomeSignals[0]}`
          : "Add key outcomes to identify critical requirements."
      },
      {
        label: "Risk signals",
        value: riskSignals.length ? riskSignals.join(" / ") : "Add risks or blockers to separate signal from noise."
      }
    ];
  }, [intake]);

  const reviewedContext = useMemo(() => {
    return intake.reviewedContext ?? buildReviewedContextFromArtifacts(intake.artifacts);
  }, [intake.artifacts, intake.reviewedContext]);

  function updateField(field: keyof Omit<ProgramIntake, "artifacts" | "reviewedContext">, value: string) {
    if (field === "programName" && saveError) setSaveError(null);
    setIntake((current) => ({ ...current, [field]: value }));
  }

  function loadSampleProgram() {
    setIntake(sampleIntake);
    setSavedProgramId(null);
    setSaveState("idle");
    setGenerateState("idle");
    setSavedAt(null);
    setSaveError(null);
    setArtifactStatus("Loaded a sample SoW with extracted context.");
  }

  async function extractArtifactOnServer(file: File, fileFormat: NonNullable<ProgramArtifact["fileFormat"]>) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileFormat", fileFormat);

    const response = await fetch("/api/artifacts/extract", {
      method: "POST",
      body: formData
    });

    if (!response.ok) throw new Error("Artifact extraction failed.");
    const payload = (await response.json()) as {
      extraction: Pick<
        ProgramArtifact,
        "extractedText" | "extractionStatus" | "extractionSummary" | "extractionMethod" | "sourceKind"
      >;
    };
    return payload.extraction;
  }

  async function uploadArtifactOnServer(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/artifacts/upload", {
      method: "POST",
      body: formData
    });

    if (!response.ok) throw new Error("Artifact upload failed.");
    const payload = (await response.json()) as {
      artifact: {
        provider: NonNullable<ProgramArtifact["storageProvider"]>;
        storageKey: string;
        createdAt: string;
      };
    };

    return {
      storageProvider: payload.artifact.provider,
      storageKey: payload.artifact.storageKey,
      uploadedAt: payload.artifact.createdAt,
      uploadStatus: "stored" as const
    };
  }

  async function handleArtifacts(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    setArtifactStatus("Reading artifacts...");
    const artifacts: ProgramArtifact[] = await Promise.all(
      files.map(async (file) => {
        const fileFormat = detectFileFormat(file.name);
        const artifactType = inferArtifactType(file.name);
        const sourceQuality = inferSourceQuality(fileFormat, artifactType);
        const baseArtifact = {
          id: `${file.name}-${file.lastModified}-${file.size}`,
          name: file.name,
          size: file.size,
          type: file.type || "unknown",
          lastModified: file.lastModified,
          fileFormat,
          artifactType,
          sourceQuality,
          analysisPriority: artifactType === "unknown" ? ("medium" as const) : ("high" as const)
        };
        let uploadMetadata: Partial<ProgramArtifact> = {};

        try {
          try {
            uploadMetadata = await uploadArtifactOnServer(file);
          } catch {
            uploadMetadata = { uploadStatus: "error" as const };
          }

          if (canUseServerParser(fileFormat)) {
            const extraction = await extractArtifactOnServer(file, fileFormat);
            return {
              ...baseArtifact,
              ...uploadMetadata,
              ...extraction
            };
          }

          if (!isTextFile(file)) {
            return {
              ...baseArtifact,
              ...uploadMetadata,
              sourceKind: "metadata-only" as const,
              extractionStatus: "unsupported" as const,
              extractionMethod: "metadata-only" as const,
              extractionSummary: "Metadata captured. This format is not supported by the local parser yet."
            };
          }

          const extractedText = await file.text();
          const cleanedText = extractedText.trim();

          if (!cleanedText) {
            return {
              ...baseArtifact,
              sourceKind: "text" as const,
              extractionStatus: "empty" as const,
              extractionMethod: "browser-text" as const,
              extractionSummary: "File was readable, but no text was found."
            };
          }

          return {
            ...baseArtifact,
            ...uploadMetadata,
            sourceKind: "text" as const,
            extractionStatus: "extracted" as const,
            extractionMethod: "browser-text" as const,
            extractionSummary: `${cleanedText.length.toLocaleString()} characters extracted. ${compactText(cleanedText, 120)}`,
            extractedText: cleanedText
          };
        } catch {
          return {
            ...baseArtifact,
            ...uploadMetadata,
            sourceKind: "metadata-only" as const,
            extractionStatus: "error" as const,
            extractionMethod: canUseServerParser(fileFormat) ? ("server-parser" as const) : ("browser-text" as const),
            extractionSummary: canUseServerParser(fileFormat)
              ? "Server extraction failed. Metadata was captured so the artifact can still be tracked."
              : "Text extraction failed in the browser."
          };
        }
      })
    );

    const inferredProgramName = !intake.programName.trim() ? inferProgramNameFromArtifact(files[0]?.name ?? "") : "";
    setIntake((current) => {
      const nextArtifacts = [...current.artifacts, ...artifacts].filter(
        (artifact, index, all) => all.findIndex((candidate) => candidate.id === artifact.id) === index
      );

      return {
        ...current,
        programName: current.programName.trim() || inferredProgramName || current.programName,
        artifacts: nextArtifacts,
        reviewedContext: current.reviewedContext ?? buildReviewedContextFromArtifacts(nextArtifacts)
      };
    });
    const extractedCount = artifacts.filter((artifact) => artifact.extractionStatus === "extracted").length;
    const partialCount = artifacts.filter((artifact) => artifact.extractionStatus === "partial").length;
    setArtifactStatus(
      extractedCount || partialCount
        ? `${extractedCount + partialCount} artifact${extractedCount + partialCount === 1 ? "" : "s"} produced extractable text.${inferredProgramName ? ` Program name set to ${inferredProgramName}.` : ""}`
        : `Metadata captured.${inferredProgramName ? ` Program name set to ${inferredProgramName}.` : ""}`
    );
    if (inferredProgramName) setSaveError(null);
    event.target.value = "";
  }

  function removeArtifact(id: string) {
    setIntake((current) => ({
      ...current,
      artifacts: current.artifacts.filter((artifact) => artifact.id !== id),
      reviewedContext: current.artifacts.filter((artifact) => artifact.id !== id).length ? current.reviewedContext : undefined
    }));
  }

  function updateArtifactClassification(id: string, updates: Partial<ProgramArtifact>) {
    setIntake((current) => ({
      ...current,
      artifacts: current.artifacts.map((artifact) => (artifact.id === id ? { ...artifact, ...updates } : artifact))
    }));
  }

  function updateReviewedContext(field: keyof Omit<ReviewedArtifactContext, "confidence" | "reviewedAt">, value: string) {
    setIntake((current) => ({
      ...current,
      reviewedContext: {
        ...(current.reviewedContext ?? reviewedContext ?? emptyReviewedContext),
        [field]: value,
        reviewedAt: new Date().toISOString()
      }
    }));
  }

  function setReviewedConfidence(confidence: ReviewedArtifactContext["confidence"]) {
    setIntake((current) => ({
      ...current,
      reviewedContext: {
        ...(current.reviewedContext ?? reviewedContext ?? emptyReviewedContext),
        confidence,
        reviewedAt: new Date().toISOString()
      }
    }));
  }

  function prefillFromArtifact(artifact: ProgramArtifact) {
    if (!artifact.extractedText) return;
    const prefill = buildPrefillFromArtifact(artifact.extractedText);
    type PrefillField = keyof Omit<ProgramIntake, "artifacts" | "reviewedContext" | "teamRoles" | "leadershipReviewCadence">;
    const populated = Object.entries(prefill).filter(([field, value]) => {
      const intakeField = field as PrefillField;
      const nextValue = typeof value === "string" ? value : "";
      return !intake[intakeField].trim() && Boolean(nextValue.trim());
    }).length;

    setIntake((current) => {
      const next = { ...current };
      Object.entries(prefill).forEach(([field, value]) => {
        const intakeField = field as PrefillField;
        const nextValue = typeof value === "string" ? value : "";
        if (!next[intakeField].trim() && nextValue.trim()) {
          next[intakeField] = nextValue;
        }
      });
      return next;
    });

    setArtifactStatus(
      populated
        ? `Prefilled ${populated} empty field${populated === 1 ? "" : "s"} from ${artifact.name}.`
        : `${artifact.name} is available, but filled fields were left unchanged.`
    );
  }

  function prefillFromAllArtifacts() {
    const context = reviewedContext;
    if (!context) return;
    type PrefillField = keyof Omit<ProgramIntake, "artifacts" | "reviewedContext" | "teamRoles" | "leadershipReviewCadence">;
    const prefill: Partial<Omit<ProgramIntake, "artifacts" | "reviewedContext" | "teamRoles" | "leadershipReviewCadence">> = {
      outcomes: context.outcomes,
      stakeholders: context.stakeholders,
      risks: context.risks,
      constraints: context.requirements,
      decisionsNeeded: context.decisions,
      sowSummary: context.outputs
    };
    const populated = Object.entries(prefill).filter(([field, value]) => {
      const intakeField = field as PrefillField;
      const nextValue = typeof value === "string" ? value : "";
      return !intake[intakeField].trim() && Boolean(nextValue.trim());
    }).length;

    setIntake((current) => {
      const next = { ...current };
      Object.entries(prefill).forEach(([field, value]) => {
        const intakeField = field as PrefillField;
        const nextValue = typeof value === "string" ? value : "";
        if (!next[intakeField].trim() && nextValue.trim()) {
          next[intakeField] = nextValue;
        }
      });
      return next;
    });

    setArtifactStatus(
      populated
        ? `Applied reviewed artifact context to ${populated} empty field${populated === 1 ? "" : "s"}.`
        : "Reviewed context is available, but filled fields were left unchanged."
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasProgramName) {
      setSaveState("error");
      setSavedProgramId(null);
      setSaveError("Program name is required before this record can be saved.");
      setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      return;
    }

    window.localStorage.setItem("work-path-program-intake", JSON.stringify(intake));
    setSaveState("saving");
    setSaveError(null);

    try {
      const response = await fetch("/api/programs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(intake)
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({ error: "Program save failed." }))) as { error?: string };
        throw new Error(payload.error || "Program save failed.");
      }
      const payload = (await response.json()) as { program: { id: string } };
      setSavedProgramId(payload.program.id);
      setSaveState("saved");
      setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch (error) {
      setSavedProgramId(null);
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Program save failed.");
      setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    }
  }

  async function saveAndGeneratePlan() {
    if (!hasProgramName) {
      setSaveState("error");
      setGenerateState("error");
      setSavedProgramId(null);
      setSaveError("Program name is required before a guided plan can be generated.");
      setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      return;
    }

    window.localStorage.setItem("work-path-program-intake", JSON.stringify(intake));
    setSaveState("saving");
    setGenerateState("generating");
    setSaveError(null);

    try {
      const saveResponse = await fetch("/api/programs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(intake)
      });

      if (!saveResponse.ok) {
        const payload = (await saveResponse.json().catch(() => ({ error: "Program save failed." }))) as { error?: string };
        throw new Error(payload.error || "Program save failed.");
      }
      const savePayload = (await saveResponse.json()) as { program: { id: string } };
      setSavedProgramId(savePayload.program.id);
      setSaveState("saved");
      setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));

      const planResponse = await fetch(`/api/programs/${savePayload.program.id}/guided-plan`, {
        method: "POST"
      });

      if (!planResponse.ok) throw new Error("Guided plan generation failed.");
      router.push(`/systems?program=${encodeURIComponent(savePayload.program.id)}`);
    } catch (error) {
      setSavedProgramId(null);
      setSaveState("error");
      setGenerateState("error");
      setSaveError(error instanceof Error ? error.message : "Guided plan generation failed.");
      setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    }
  }

  return (
    <section id="program-intake" className="border-y border-white/10 bg-white/[0.02]">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:px-8">
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-emerald-300">Program intake</p>
          <h2 className="text-3xl font-semibold text-zinc-50 md:text-4xl">Frame the program before the pressure starts.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Capture the context, constraints, stakeholders, and desired outcomes. From there, the system generates the first guided plan, key outputs, and the clearest starting path.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              ["1", "Load a demo or enter a live program frame."],
              ["2", "Upload supporting artifacts and review extracted context."],
              ["3", "Generate a guided plan and open the working output."]
            ].map(([step, label]) => (
              <div key={step} className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-300">Step {step}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-300">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={loadSampleProgram}>
              <FileText className="h-4 w-4" />
              Load demo program
            </Button>
            <a
              href="/systems"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/10 px-4 text-sm font-medium text-zinc-100 transition-colors hover:bg-white/10"
            >
              Open guided plans
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
            <Card className="bg-zinc-950/80">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="flex items-center gap-2 text-zinc-50">
                  <ClipboardList className="h-4 w-4 text-emerald-200" />
                  Program Intake
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 p-5">
                <label className="grid gap-2">
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Program name</span>
                  <input
                    value={intake.programName}
                    onChange={(event) => updateField("programName", event.target.value)}
                    placeholder="Program, client, initiative, or workstream name"
                    className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-emerald-300/50"
                  />
                  <span className="text-xs leading-5 text-zinc-400">
                    Required. This becomes the saved program source used in Guided Plans, Active Program, and Leadership.
                  </span>
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  {textFields.map((field) => (
                    <label key={field.id} className={field.rows > 3 ? "grid gap-2 md:col-span-2" : "grid gap-2"}>
                      <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">{field.label}</span>
                      <textarea
                        value={intake[field.id]}
                        onChange={(event) => updateField(field.id, event.target.value)}
                        placeholder={field.placeholder}
                        rows={field.rows}
                        className="resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-emerald-300/50"
                      />
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-950/80">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="flex items-center gap-2 text-zinc-50">
                  <FolderUp className="h-4 w-4 text-cyan-200" />
                  Intake Artifacts
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 p-5">
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-cyan-300/30 bg-cyan-300/[0.045] px-4 py-8 text-center transition-colors hover:border-cyan-300/60">
                  <FolderUp className="mb-3 h-7 w-7 text-cyan-200" />
                  <span className="text-sm font-medium text-zinc-100">Add SoW, plan, notes, or intake artifacts</span>
                  <span className="mt-2 text-xs leading-5 text-zinc-300">
                    The app detects file format, classifies artifact role, and extracts text from TXT, PDF, DOCX, and PPTX. Legacy DOC/PPT use best-effort extraction.
                  </span>
                  <input className="hidden" type="file" multiple accept=".txt,.pdf,.doc,.docx,.ppt,.pptx,text/plain" onChange={handleArtifacts} />
                </label>
                {artifactStatus ? <p className="text-xs font-medium text-cyan-100">{artifactStatus}</p> : null}

                {intake.artifacts.length ? (
                  <div className="grid gap-2">
                    {intake.artifacts.map((artifact) => (
                      <div
                        key={artifact.id}
                        className="grid gap-3 rounded-md border border-white/10 bg-white/[0.035] p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-zinc-100">{artifact.name}</p>
                            <p className="mt-1 text-xs text-zinc-400">
                              {(artifact.fileFormat ?? "unknown").toUpperCase()} / {artifact.type} / {formatFileSize(artifact.size)}
                            </p>
                            {artifact.storageProvider ? (
                              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-cyan-200">
                                Stored in {artifact.storageProvider}
                              </p>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeArtifact(artifact.id)}
                            className="rounded-md border border-white/10 bg-black/20 p-2 text-zinc-400 transition-colors hover:border-red-300/30 hover:text-red-200"
                            aria-label={`Remove ${artifact.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid gap-3 rounded-md border border-cyan-300/15 bg-cyan-300/[0.035] p-3 md:grid-cols-3">
                          <label className="grid gap-2">
                            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-cyan-100">
                              Artifact type
                            </span>
                            <select
                              value={artifact.artifactType ?? "unknown"}
                              onChange={(event) =>
                                updateArtifactClassification(artifact.id, {
                                  artifactType: event.target.value as NonNullable<ProgramArtifact["artifactType"]>
                                })
                              }
                              className="h-10 rounded-md border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-cyan-300/50"
                            >
                              {artifactTypeOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="grid gap-2">
                            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-cyan-100">
                              Source quality
                            </span>
                            <select
                              value={artifact.sourceQuality ?? "unknown"}
                              onChange={(event) =>
                                updateArtifactClassification(artifact.id, {
                                  sourceQuality: event.target.value as NonNullable<ProgramArtifact["sourceQuality"]>
                                })
                              }
                              className="h-10 rounded-md border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-cyan-300/50"
                            >
                              {sourceQualityOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="grid gap-2">
                            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-cyan-100">
                              Analysis priority
                            </span>
                            <select
                              value={artifact.analysisPriority ?? "medium"}
                              onChange={(event) =>
                                updateArtifactClassification(artifact.id, {
                                  analysisPriority: event.target.value as NonNullable<ProgramArtifact["analysisPriority"]>
                                })
                              }
                              className="h-10 rounded-md border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-cyan-300/50"
                            >
                              {analysisPriorityOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        {artifact.extractionStatus ? (
                          <div className="rounded-md border border-white/10 bg-black/20 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap gap-2">
                                <span
                                  className={`rounded-full border px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${
                                    artifact.extractionStatus === "extracted"
                                      ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                                      : artifact.extractionStatus === "partial"
                                        ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
                                        : artifact.extractionStatus === "unsupported"
                                          ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
                                          : "border-zinc-300/20 bg-zinc-300/10 text-zinc-200"
                                  }`}
                                >
                                  {artifact.extractionStatus === "extracted"
                                    ? "Text extracted"
                                    : artifact.extractionStatus === "partial"
                                      ? "Partial text"
                                      : artifact.extractionStatus}
                                </span>
                                {artifact.extractionMethod ? (
                                  <span className="rounded-full border border-white/10 bg-white/[0.035] px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-300">
                                    {artifact.extractionMethod.replace(/-/g, " ")}
                                  </span>
                                ) : null}
                                {artifact.uploadStatus ? (
                                  <span
                                    className={`rounded-full border px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${
                                      artifact.uploadStatus === "stored"
                                        ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
                                        : "border-amber-300/25 bg-amber-300/10 text-amber-100"
                                    }`}
                                  >
                                    {artifact.uploadStatus === "stored" ? "Stored" : "Storage issue"}
                                  </span>
                                ) : null}
                              </div>
                              {artifact.extractedText ? (
                                <Button type="button" variant="outline" size="sm" onClick={() => prefillFromArtifact(artifact)}>
                                  Use text to prefill intake
                                </Button>
                              ) : null}
                            </div>
                            <p className="mt-2 text-xs leading-5 text-zinc-300">{artifact.extractionSummary}</p>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                {reviewedContext ? (
                  <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.045] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-emerald-100">Review extracted context</p>
                          <span
                            className={`rounded-full border px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${
                              reviewedContext.confidence === "high"
                                ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                                : reviewedContext.confidence === "medium"
                                  ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
                                  : "border-amber-300/25 bg-amber-300/10 text-amber-100"
                            }`}
                          >
                            {reviewedContext.confidence} confidence
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-zinc-300">
                          Edit the extracted signals before applying them. These reviewed fields become the standardized source for guidance.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(["high", "medium", "low"] as const).map((confidence) => (
                          <button
                            key={confidence}
                            type="button"
                            onClick={() => setReviewedConfidence(confidence)}
                            className={`rounded-md border px-3 py-2 text-xs font-medium capitalize transition-colors ${
                              reviewedContext.confidence === confidence
                                ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-100"
                                : "border-white/10 bg-black/20 text-zinc-300 hover:border-white/20"
                            }`}
                          >
                            {confidence}
                          </button>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={prefillFromAllArtifacts}>
                          <CheckCircle2 className="h-4 w-4" />
                          Apply reviewed context
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {reviewedContextFields.map((field) => (
                        <label key={field.id} className="grid gap-2 rounded-md border border-white/10 bg-black/20 p-3">
                          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-100">
                            {field.label}
                          </span>
                          <textarea
                            value={reviewedContext[field.id]}
                            onChange={(event) => updateReviewedContext(field.id, event.target.value)}
                            rows={3}
                            className="resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-xs leading-5 text-zinc-100 outline-none transition-colors placeholder:text-zinc-400 focus:border-emerald-300/50"
                          />
                        </label>
                      ))}
                    </div>
                    <p className="mt-3 text-xs leading-5 text-zinc-400">
                      Reviewed context is saved with the program and will be included in the future OpenAI grounding payload.
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" size="lg" disabled={!hasProgramName || saveState === "saving" || generateState === "generating"}>
                <Save className="h-4 w-4" />
                {saveState === "saving" ? "Saving..." : "Save program"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => {
                  setIntake(emptyIntake);
                  setSavedProgramId(null);
                  setSavedAt(null);
                  setSaveState("idle");
                  setGenerateState("idle");
                  setArtifactStatus(null);
                  setSaveError(null);
                }}
              >
                Clear form
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => void saveAndGeneratePlan()}
                disabled={!hasProgramName || generateState === "generating" || saveState === "saving"}
              >
                <Sparkles className={`h-4 w-4 ${generateState === "generating" ? "animate-spin" : ""}`} />
                {generateState === "generating" ? "Generating..." : "Generate guided plan"}
              </Button>
              {!hasProgramName ? <p className="self-center text-sm text-amber-200">Add a program name to enable save and guided plan actions.</p> : null}
              {savedAt ? (
                <p className={`self-center text-sm ${saveState === "error" ? "text-amber-200" : "text-emerald-200"}`}>
                  {saveState === "error" ? saveError || "Program save failed." : "Saved to server"} at {savedAt}
                  {savedProgramId && saveState === "saved" ? (
                    <a href={`/systems?program=${savedProgramId}`} className="ml-2 text-emerald-100 underline underline-offset-4">
                      Open plan
                    </a>
                  ) : null}
                </p>
              ) : null}
            </div>
          </form>
        </div>

        <aside className="grid gap-4 self-start lg:sticky lg:top-24">
          <Card className="bg-zinc-950/80">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="flex items-center gap-2 text-zinc-50">
                <Sparkles className="h-4 w-4 text-cyan-200" />
                Demo path
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-5">
              <div className="rounded-md border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-zinc-300">
                Use the demo program to walk through intake, artifact grounding, guided planning, and the leadership loop without entering fresh data live.
              </div>
              <Button type="button" variant="outline" onClick={loadSampleProgram}>
                <FileText className="h-4 w-4" />
                Load demo program
              </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void saveAndGeneratePlan()}
                  disabled={!hasProgramName || generateState === "generating" || saveState === "saving"}
                >
                <Sparkles className={`h-4 w-4 ${generateState === "generating" ? "animate-spin" : ""}`} />
                Open demo guided plan
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950/80">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="flex items-center gap-2 text-zinc-50">
                <ListChecks className="h-4 w-4 text-emerald-200" />
                Intake readiness
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-5">
              <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Context captured</span>
                  <span className="font-medium text-zinc-100">{completion}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
                  <div className="h-full bg-emerald-300 transition-all" style={{ width: `${completion}%` }} />
                </div>
              </div>
              <div className="rounded-md border border-amber-300/20 bg-amber-300/[0.055] p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-100">
                  <ShieldAlert className="h-4 w-4" />
                  Server persistence active
                </div>
                <p className="text-xs leading-5 text-zinc-400">
                  Program intake saves to the configured server store. Intake artifacts are captured as grounded context for guided plans.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950/80">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="flex items-center gap-2 text-zinc-50">
                <FileText className="h-4 w-4 text-cyan-200" />
                Guidance preview
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-5">
              {guidancePreview.map((item) => (
                <div key={item.label} className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">{item.value}</p>
                </div>
              ))}
              <div className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.055] p-3">
                <p className="flex items-center gap-2 text-sm font-medium text-emerald-100">
                  Future model payload
                  <ArrowRight className="h-4 w-4" />
                </p>
                <p className="mt-2 text-xs leading-5 text-zinc-400">
                  Structured intake plus artifact text will become the grounded context for OpenAI.
                </p>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </section>
  );
}
