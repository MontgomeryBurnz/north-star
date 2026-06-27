import { readFileSync } from "node:fs";
import { join } from "node:path";

export type KnowledgeArticleAudience =
  | "Admin"
  | "Client"
  | "Delivery Lead"
  | "Leadership"
  | "Team Member";

export type KnowledgeArticle = {
  audience: KnowledgeArticleAudience[];
  category: "Executive" | "Operations" | "Training" | "Trust";
  description: string;
  id: string;
  markdown: string;
  module: string;
  path: string;
  searchText: string;
  title: string;
};

const knowledgeSources = [
  {
    audience: ["Leadership", "Delivery Lead", "Admin", "Client"],
    category: "Executive",
    description: "Executive framing, buyer-ready story, demo flow, and leadership talking points.",
    id: "executive-review",
    module: "Executive Review",
    path: "docs/northstar-executive-demo-guide.md",
    title: "Executive Application Review"
  },
  {
    audience: ["Team Member", "Delivery Lead", "Leadership", "Client", "Admin"],
    category: "Training",
    description: "Daily user guide, training path, module instructions, examples, and troubleshooting.",
    id: "user-guide",
    module: "Training Manual",
    path: "docs/northstar-team-user-guide.md",
    title: "User Guide & Training Manual"
  },
  {
    audience: ["Admin", "Delivery Lead"],
    category: "Operations",
    description: "Evergreen Knowledge Center model, AI-assisted refresh workflow, and content governance.",
    id: "knowledge-management",
    module: "Knowledge Center",
    path: "docs/northstar-knowledge-management-solution.md",
    title: "Knowledge Management Solution"
  },
  {
    audience: ["Admin", "Delivery Lead"],
    category: "Trust",
    description: "Codebase, Vercel, Supabase, OpenAI, Resend, QA, and documentation map.",
    id: "project-map",
    module: "Product Operations",
    path: "docs/northstar-project-map.md",
    title: "NorthStar Project Map"
  },
  {
    audience: ["Admin", "Delivery Lead"],
    category: "Trust",
    description: "Production push checklist, smoke coverage, cleanup expectations, and documentation gate.",
    id: "release-checklist",
    module: "Release Management",
    path: "docs/northstar-release-checklist.md",
    title: "Release Checklist"
  }
] satisfies Array<Omit<KnowledgeArticle, "markdown" | "searchText">>;

function compactMarkdownForSearch(markdown: string) {
  return markdown
    .replace(/[`*_>#|[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function getKnowledgeArticles(): KnowledgeArticle[] {
  return knowledgeSources.map((source) => {
    const markdown = readFileSync(join(process.cwd(), source.path), "utf8");
    return {
      ...source,
      markdown,
      searchText: compactMarkdownForSearch(`${source.title} ${source.description} ${source.module} ${source.category} ${source.audience.join(" ")} ${markdown}`)
    };
  });
}
