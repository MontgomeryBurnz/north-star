export const STUDIO_EXPORT_FORMATS = [
  { id: "docx", label: "Word document", extension: ".docx" },
  { id: "xlsx", label: "Excel workbook", extension: ".xlsx" },
  { id: "pptx", label: "PowerPoint presentation", extension: ".pptx" },
  { id: "md", label: "Markdown", extension: ".md" }
] as const;

export const STUDIO_OUTPUT_OPTIONS = [
  { id: "roadmap", label: "Product roadmap", description: "Delivery horizons, outcomes, and dependencies" },
  { id: "backlog", label: "Epics and features", description: "Prioritized scope with evidence references" },
  { id: "stories", label: "User stories and acceptance criteria", description: "Engineering requirements and readiness" },
  { id: "tests", label: "Test cases", description: "Happy path, negative, and edge case coverage" },
  { id: "gaps", label: "Gaps and open questions", description: "Missing information and decisions to resolve" },
  { id: "analysis", label: "Discovery analysis", description: "Evidence, capabilities, pain points, rules, and assumptions" }
] as const;

export type StudioExportFormat = (typeof STUDIO_EXPORT_FORMATS)[number]["id"];
export type StudioOutputId = (typeof STUDIO_OUTPUT_OPTIONS)[number]["id"];
