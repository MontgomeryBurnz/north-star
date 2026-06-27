"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenText, FileText, GraduationCap, Library, Search, ShieldCheck, Sparkles } from "lucide-react";
import type { KnowledgeArticle } from "@/lib/knowledge-center";
import { cn } from "@/lib/utils";

type MarkdownBlock =
  | { level: number; text: string; type: "heading" }
  | { rows: string[][]; type: "table" }
  | { text: string; type: "paragraph" | "quote" | "code" }
  | { items: string[]; type: "ordered-list" | "unordered-list" }
  | { type: "rule" };

const allCategories = ["All", "Executive", "Training", "Operations", "Trust"] as const;
const allAudiences = ["All", "Team Member", "Delivery Lead", "Leadership", "Client", "Admin"] as const;

function cleanInlineMarkdown(value: string) {
  return value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .trim();
}

function isTableDivider(line: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cleanInlineMarkdown(cell));
}

function isBlockStart(line: string) {
  return (
    /^#{1,4}\s+/.test(line) ||
    /^[-*]\s+/.test(line) ||
    /^\d+\.\s+/.test(line) ||
    /^>\s+/.test(line) ||
    /^---+$/.test(line) ||
    line.startsWith("```") ||
    line.includes("|")
  );
}

function parseMarkdown(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      blocks.push({ text: codeLines.join("\n"), type: "code" });
      index += 1;
      continue;
    }

    const headingMatch = /^(#{1,4})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      blocks.push({
        level: Math.min(headingMatch[1].length, 4),
        text: cleanInlineMarkdown(headingMatch[2]),
        type: "heading"
      });
      index += 1;
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      blocks.push({ type: "rule" });
      index += 1;
      continue;
    }

    if (trimmed.includes("|") && index + 1 < lines.length && isTableDivider(lines[index + 1])) {
      const rows = [splitTableRow(trimmed)];
      index += 2;
      while (index < lines.length && lines[index].trim().includes("|")) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      blocks.push({ rows, type: "table" });
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(cleanInlineMarkdown(lines[index].trim().replace(/^[-*]\s+/, "")));
        index += 1;
      }
      blocks.push({ items, type: "unordered-list" });
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(cleanInlineMarkdown(lines[index].trim().replace(/^\d+\.\s+/, "")));
        index += 1;
      }
      blocks.push({ items, type: "ordered-list" });
      continue;
    }

    if (/^>\s+/.test(trimmed)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s+/.test(lines[index].trim())) {
        quoteLines.push(lines[index].trim().replace(/^>\s+/, ""));
        index += 1;
      }
      blocks.push({ text: cleanInlineMarkdown(quoteLines.join(" ")), type: "quote" });
      continue;
    }

    const paragraphLines = [trimmed];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index].trim())) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ text: cleanInlineMarkdown(paragraphLines.join(" ")), type: "paragraph" });
  }

  return blocks;
}

function MarkdownArticle({ markdown }: { markdown: string }) {
  const blocks = useMemo(() => parseMarkdown(markdown), [markdown]);

  return (
    <article className="grid gap-5">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const HeadingTag = block.level === 1 ? "h2" : block.level === 2 ? "h3" : "h4";
          return (
            <HeadingTag
              key={`${block.type}-${index}`}
              className={cn(
                "tracking-normal text-zinc-50",
                block.level === 1 && "pt-1 text-3xl font-semibold",
                block.level === 2 && "pt-5 text-2xl font-semibold",
                block.level >= 3 && "pt-2 text-lg font-semibold"
              )}
            >
              {block.text}
            </HeadingTag>
          );
        }

        if (block.type === "paragraph") {
          return (
            <p key={`${block.type}-${index}`} className="max-w-4xl text-base leading-8 text-zinc-300">
              {block.text}
            </p>
          );
        }

        if (block.type === "quote") {
          return (
            <blockquote key={`${block.type}-${index}`} className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.07] p-5 text-lg font-medium leading-8 text-emerald-100">
              {block.text}
            </blockquote>
          );
        }

        if (block.type === "unordered-list" || block.type === "ordered-list") {
          const ListTag = block.type === "ordered-list" ? "ol" : "ul";
          return (
            <ListTag
              key={`${block.type}-${index}`}
              className={cn(
                "grid max-w-4xl gap-3 pl-5 text-base leading-7 text-zinc-300",
                block.type === "ordered-list" ? "list-decimal" : "list-disc"
              )}
            >
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ListTag>
          );
        }

        if (block.type === "table") {
          const [head, ...body] = block.rows;
          return (
            <div key={`${block.type}-${index}`} className="max-w-full overflow-x-auto rounded-md border border-white/10">
              <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
                <thead className="bg-white/[0.06] text-xs uppercase tracking-[0.14em] text-zinc-400">
                  <tr>
                    {head.map((cell) => (
                      <th key={cell} className="border-b border-white/10 px-4 py-3 font-semibold">
                        {cell}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {body.map((row, rowIndex) => (
                    <tr key={`${row.join("-")}-${rowIndex}`} className="border-b border-white/10 last:border-b-0">
                      {row.map((cell, cellIndex) => (
                        <td key={`${cell}-${cellIndex}`} className="px-4 py-3 align-top leading-6 text-zinc-300">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (block.type === "code") {
          return (
            <pre key={`${block.type}-${index}`} className="max-w-full overflow-x-auto rounded-md border border-white/10 bg-black/40 p-4 text-sm leading-6 text-emerald-100">
              <code>{block.text}</code>
            </pre>
          );
        }

        return <hr key={`${block.type}-${index}`} className="border-white/10" />;
      })}
    </article>
  );
}

function articleIcon(article: KnowledgeArticle) {
  if (article.category === "Executive") return Sparkles;
  if (article.category === "Training") return GraduationCap;
  if (article.category === "Trust") return ShieldCheck;
  return Library;
}

export function KnowledgeCenterConsole({ articles }: { articles: KnowledgeArticle[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof allCategories)[number]>("All");
  const [audience, setAudience] = useState<(typeof allAudiences)[number]>("All");
  const [selectedArticleId, setSelectedArticleId] = useState(articles[0]?.id ?? "");

  const filteredArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return articles.filter((article) => {
      const matchesQuery = !normalizedQuery || article.searchText.includes(normalizedQuery);
      const matchesCategory = category === "All" || article.category === category;
      const matchesAudience = audience === "All" || article.audience.includes(audience);
      return matchesQuery && matchesCategory && matchesAudience;
    });
  }, [articles, audience, category, query]);

  useEffect(() => {
    if (!filteredArticles.length) return;
    if (filteredArticles.some((article) => article.id === selectedArticleId)) return;
    setSelectedArticleId(filteredArticles[0].id);
  }, [filteredArticles, selectedArticleId]);

  const selectedArticle =
    articles.find((article) => article.id === selectedArticleId) ?? filteredArticles[0] ?? articles[0];

  return (
    <main className="northstar-shell py-16" data-knowledge-center>
      <section className="grid gap-8">
        <div className="grid gap-5">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300">Knowledge Center</p>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
            <div className="max-w-4xl">
              <h1 className="text-4xl font-semibold tracking-normal text-zinc-50 sm:text-6xl">Learn NorthStar as it evolves.</h1>
              <p className="mt-5 text-lg leading-8 text-zinc-400">
                Search the executive review, training manual, operating map, release checklist, and evergreen knowledge plan from one in-app source.
              </p>
            </div>
            <div className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.07] p-5">
              <div className="flex items-center gap-3">
                <BookOpenText className="h-5 w-5 text-emerald-200" />
                <p className="text-sm font-semibold text-zinc-50">Repo-backed guidance</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                These articles render from versioned NorthStar documentation so releases, training, and support material can stay aligned.
              </p>
            </div>
          </div>
        </div>

        <section className="rounded-md border border-white/10 bg-white/[0.035]" data-knowledge-search>
          <div className="grid gap-5 border-b border-white/10 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <label className="relative block">
              <span className="sr-only">Search NorthStar knowledge</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search workflows, roles, modules, exports, client updates..."
                className="h-14 w-full rounded-md border border-white/10 bg-black/30 pl-12 pr-4 text-base text-zinc-50 outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-300/45"
                data-knowledge-search-input
              />
            </label>
            <p className="text-sm text-zinc-500" data-knowledge-result-count>
              {filteredArticles.length} of {articles.length} articles
            </p>
          </div>

          <div className="grid gap-4 p-5">
            <div className="flex flex-wrap gap-2" aria-label="Knowledge categories">
              {allCategories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors",
                    category === item
                      ? "border-emerald-300/40 bg-emerald-300/[0.12] text-emerald-100"
                      : "border-white/10 bg-white/[0.025] text-zinc-500 hover:text-zinc-200"
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2" aria-label="Knowledge audiences">
              {allAudiences.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setAudience(item)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors",
                    audience === item
                      ? "border-sky-300/40 bg-sky-300/[0.11] text-sky-100"
                      : "border-white/10 bg-white/[0.025] text-zinc-500 hover:text-zinc-200"
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[25rem_minmax(0,1fr)]">
          <div className="grid content-start gap-3" data-knowledge-article-list>
            {filteredArticles.length ? (
              filteredArticles.map((article) => {
                const Icon = articleIcon(article);
                const selected = selectedArticle?.id === article.id;
                return (
                  <button
                    key={article.id}
                    type="button"
                    onClick={() => setSelectedArticleId(article.id)}
                    className={cn(
                      "rounded-md border p-4 text-left transition-colors",
                      selected
                        ? "border-emerald-300/30 bg-emerald-300/[0.08]"
                        : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.045]"
                    )}
                    data-knowledge-article-card={article.id}
                  >
                    <span className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 bg-black/25">
                        <Icon className={cn("h-5 w-5", selected ? "text-emerald-200" : "text-zinc-400")} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-base font-semibold text-zinc-50">{article.title}</span>
                        <span className="mt-2 block text-sm leading-6 text-zinc-400">{article.description}</span>
                      </span>
                    </span>
                    <span className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                        {article.category}
                      </span>
                      <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                        {article.module}
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="rounded-md border border-white/10 bg-white/[0.03] p-5">
                <p className="font-semibold text-zinc-50">No articles found.</p>
                <p className="mt-2 text-sm leading-6 text-zinc-500">Try a broader keyword, category, or audience filter.</p>
              </div>
            )}
          </div>

          {selectedArticle ? (
            <section className="min-w-0 rounded-md border border-white/10 bg-white/[0.035]" data-knowledge-selected-article={selectedArticle.id}>
              <header className="border-b border-white/10 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">{selectedArticle.module}</p>
                    <h2 className="mt-3 text-3xl font-semibold tracking-normal text-zinc-50">{selectedArticle.title}</h2>
                    <p className="mt-3 max-w-3xl text-base leading-7 text-zinc-400">{selectedArticle.description}</p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                    <FileText className="h-4 w-4" />
                    {selectedArticle.category}
                  </span>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {selectedArticle.audience.map((item) => (
                    <span key={item} className="rounded-full border border-sky-300/20 bg-sky-300/[0.07] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-100">
                      {item}
                    </span>
                  ))}
                </div>
              </header>
              <div className="p-6">
                <MarkdownArticle markdown={selectedArticle.markdown} />
              </div>
            </section>
          ) : null}
        </section>
      </section>
    </main>
  );
}
