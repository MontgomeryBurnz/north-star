export type ProgramArtifact = {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  storageProvider?: "local" | "blob" | "supabase";
  storageKey?: string;
  uploadedAt?: string;
  uploadStatus?: "stored" | "error";
  fileFormat?: "txt" | "pdf" | "doc" | "docx" | "ppt" | "pptx" | "unknown";
  artifactType?:
    | "sow"
    | "project-plan"
    | "status-report"
    | "risk-log"
    | "requirements"
    | "meeting-notes"
    | "strategy-deck"
    | "unknown";
  sourceQuality?: "structured" | "semi-structured" | "narrative" | "presentation" | "raw-notes" | "unknown";
  analysisPriority?: "high" | "medium" | "low";
  sourceKind?: "text" | "metadata-only";
  extractionStatus?: "extracted" | "partial" | "unsupported" | "empty" | "error";
  extractionMethod?: "browser-text" | "server-parser" | "legacy-best-effort" | "metadata-only";
  extractionSummary?: string;
  extractedText?: string;
};

export type ReviewedArtifactContext = {
  outcomes: string;
  stakeholders: string;
  risks: string;
  requirements: string;
  decisions: string;
  outputs: string;
  confidence: "high" | "medium" | "low";
  reviewedAt?: string;
};

export type ProgramIntake = {
  programName: string;
  programOwner: string;
  vision: string;
  sowSummary: string;
  outcomes: string;
  stakeholders: string;
  risks: string;
  constraints: string;
  currentStatus: string;
  decisionsNeeded: string;
  blockers: string;
  teamRoles?: string[];
  leadershipReviewCadence?: "weekly" | "biweekly";
  artifacts: ProgramArtifact[];
  reviewedContext?: ReviewedArtifactContext;
};

export type StoredProgram = {
  id: string;
  createdAt: string;
  updatedAt: string;
  intake: ProgramIntake;
};
