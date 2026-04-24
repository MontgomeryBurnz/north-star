"use client";

import { FormEvent, useMemo, useState } from "react";
import { Bot, Braces, Database, Gauge, LockKeyhole, Send, Sparkles, UserRound } from "lucide-react";
import { aiProducts, assistantFaqs, experiments, frameworks, initiatives } from "@/data";
import { getAssistantApiResponse } from "@/lib/assistant-client";
import type {
  AssistantDebug,
  AssistantProviderId,
  AssistantRelatedItem,
  AssistantResponse,
  AssistantSection,
  MatchedContent
} from "@/lib/assistant-types";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  bullets?: string[];
  sections?: AssistantSection[];
  sources?: string[];
  relatedContent?: AssistantRelatedItem[];
  mode?: AssistantResponse["mode"];
  matches?: MatchedContent[];
  debug?: AssistantDebug;
  provider?: AssistantProviderId;
};

type ConversationTurn = {
  id: string;
  user: ChatMessage;
  assistant?: ChatMessage;
};

const starterMessage: ChatMessage = {
  id: "starter",
  role: "assistant",
  content: "Give me the program context. I will help shape the plan, risks, outputs, and next move.",
  sections: [
    {
      title: "Work Path Surface",
      items: [
        "Separate the signal from the noise.",
        "Clarify what matters now: plan, owners, risks, outputs, or decisions.",
        "Use demo mode to inspect the retrieval trace."
      ]
    }
  ],
  sources: ["Local assistant content"],
  mode: "direct",
  matches: []
};

function responseToMessage(response: AssistantResponse & { provider?: AssistantProviderId }): ChatMessage {
  return {
    id: `assistant-${Date.now()}`,
    role: "assistant",
    content: response.answer,
    bullets: response.bullets,
    sections: response.sections,
    sources: response.sources,
    relatedContent: response.relatedContent,
    mode: response.mode,
    matches: response.matches,
    debug: response.debug,
    provider: response.provider
  };
}

export function AssistantChat() {
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [lastRelatedPrompts, setLastRelatedPrompts] = useState<string[]>([]);
  const [demoMode, setDemoMode] = useState(true);

  const suggestedPrompts = useMemo(() => assistantFaqs.map((faq) => faq.question), []);
  const latestAssistantMessage = turns.length ? turns[turns.length - 1]?.assistant : undefined;
  const activeModelProfile = latestAssistantMessage?.debug?.modelProfile;

  async function submitPrompt(prompt: string) {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isThinking) return;

    const turnId = `turn-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmedPrompt
    };

    setInput("");
    setIsThinking(true);
    setTurns((current) => [...current, { id: turnId, user: userMessage }]);

    await new Promise((resolve) => window.setTimeout(resolve, 360));
    const response = await getAssistantApiResponse(trimmedPrompt);
    const assistantMessage = responseToMessage(response);

    setLastRelatedPrompts(response.relatedPrompts);
    setTurns((current) =>
      current.map((turn) => (turn.id === turnId ? { ...turn, assistant: assistantMessage } : turn))
    );
    setIsThinking(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitPrompt(input);
  }

  return (
    <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
      <section className="overflow-hidden rounded-lg border border-white/10 bg-zinc-950/85 shadow-glow">
        <div className="border-b border-white/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.22em] text-emerald-300">North Star</p>
              <h1 className="flex items-center gap-3 text-3xl font-semibold text-zinc-50">
                <Bot className="h-7 w-7 text-emerald-200" />
                Work Path Assistant
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100">
                server assistant
              </div>
              <div className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">
                API-ready
              </div>
              <button
                type="button"
                onClick={() => setDemoMode((current) => !current)}
                className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-1 text-xs text-zinc-300 transition-colors hover:border-emerald-300/30 hover:text-zinc-50"
              >
                Demo {demoMode ? "on" : "off"}
              </button>
            </div>
          </div>
        </div>

        <div className="grid min-h-[650px] grid-rows-[auto_1fr_auto]">
          <div className="border-b border-white/10 bg-white/[0.025] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Prompt chips</p>
                <p className="text-xs text-zinc-600">seeded tests</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void submitPrompt(prompt)}
                  className="rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-left text-xs text-zinc-300 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300/40 hover:text-zinc-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[58vh] space-y-4 overflow-y-auto p-5">
            <AssistantMessage message={starterMessage} demoMode={demoMode} />
            {turns.map((turn) => (
              <div key={turn.id} className="animate-[fadeIn_260ms_ease-out_both] space-y-3">
                <UserMessage message={turn.user} />
                {turn.assistant ? <AssistantMessage message={turn.assistant} demoMode={demoMode} /> : null}
              </div>
            ))}
            {isThinking ? (
              <div className="animate-[fadeIn_220ms_ease-out_both] rounded-lg border border-white/10 bg-white/[0.035] p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                  <Bot className="h-3.5 w-3.5 text-cyan-200" />
                  Assistant
                </div>
                <div className="inline-flex items-center gap-2 rounded-md border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  Retrieving system records
                </div>
              </div>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-white/10 bg-zinc-900/70 p-4">
            <div className="flex items-center gap-3">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Describe the program, risk, decision, or next output needed..."
                className="min-h-11 flex-1 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-300/50"
              />
              <Button type="submit" aria-label="Send prompt" disabled={isThinking}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </section>

      <aside className="grid gap-4 self-start">
        <Card className="bg-zinc-950/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-zinc-50">
              <Gauge className="h-4 w-4 text-emerald-200" />
              Assistant state
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.035] p-3">
              <span className="text-zinc-400">Mode</span>
              <span className="text-zinc-100">server</span>
            </div>
            <div className="grid gap-2 rounded-md border border-white/10 bg-white/[0.035] p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-400">Model</span>
                <span className="text-zinc-100">{activeModelProfile?.model ?? "gpt-5.5 target"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-400">Reasoning</span>
                <span className="text-zinc-100">{activeModelProfile?.reasoningEffort ?? "medium"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-400">Verbosity</span>
                <span className="text-zinc-100">{activeModelProfile?.verbosity ?? "low"}</span>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.035] p-3">
              <span className="text-zinc-400">Indexed records</span>
              <span className="text-zinc-100">
                {initiatives.length + assistantFaqs.length + frameworks.length + aiProducts.length + experiments.length}
              </span>
            </div>
            <div className="rounded-md border border-cyan-300/20 bg-cyan-300/10 p-3 text-xs leading-5 text-cyan-100">
              Local grounding remains authoritative, but the UI now runs through the server assistant route.
            </div>
            <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.035] p-3">
              <span className="text-zinc-400">Demo records</span>
              <button
                type="button"
                onClick={() => setDemoMode((current) => !current)}
                className="rounded-md border border-white/10 bg-zinc-950 px-2 py-1 text-xs text-zinc-300 hover:border-emerald-300/30"
              >
                {demoMode ? "visible" : "hidden"}
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-zinc-50">
              <Sparkles className="h-4 w-4 text-emerald-200" />
              Prompt queue
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {(lastRelatedPrompts.length ? lastRelatedPrompts : suggestedPrompts.slice(0, 4)).map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void submitPrompt(prompt)}
                className="rounded-md border border-white/10 bg-white/[0.035] p-3 text-left text-sm leading-6 text-zinc-300 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300/30 hover:text-zinc-50"
              >
                {prompt}
              </button>
            ))}
          </CardContent>
        </Card>

        {demoMode ? (
        <Card className="bg-zinc-950/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-zinc-50">
              <Database className="h-4 w-4 text-cyan-200" />
              Local response sources
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {initiatives.map((initiative) => (
              <div key={initiative.id} className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-100">{initiative.title}</p>
                  <StatusBadge status={initiative.status} />
                </div>
                <p className="flex items-center gap-2 text-xs leading-5 text-zinc-400">
                  <LockKeyhole className="h-3 w-3 text-amber-200" />
                  {initiative.systemDesigned}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
        ) : null}
      </aside>
    </main>
  );
}

function UserMessage({ message }: { message: ChatMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[84%] rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-emerald-200/80">
          <UserRound className="h-3.5 w-3.5 text-emerald-200" />
          You
        </div>
        <p className="text-sm leading-6 text-emerald-50">{message.content}</p>
      </div>
    </div>
  );
}

function AssistantMessage({ message, demoMode }: { message: ChatMessage; demoMode: boolean }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[88%] rounded-lg border border-white/10 bg-white/[0.035] p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            <Bot className="h-3.5 w-3.5 text-cyan-200" />
            Assistant
            {message.provider ? <span className="text-zinc-600">{message.provider}</span> : null}
          </div>
          {message.mode ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs text-zinc-400">
              <Braces className="h-3 w-3 text-zinc-500" />
              {message.mode}
            </span>
          ) : null}
        </div>
        <p className="text-sm leading-6 text-zinc-200">{message.content}</p>
        {message.sections?.length ? (
          <div className="mt-3 grid gap-3">
            {message.sections.map((section) => (
              <div key={section.title} className="rounded-md border border-white/10 bg-black/20 p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                  {section.title}
                </p>
                <div className="grid gap-2">
                  {section.items.map((item, index) => (
                    <p key={`${section.title}-${index}`} className="text-sm leading-6 text-zinc-300">
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : message.bullets?.length ? (
          <div className="mt-3 grid gap-2">
            {message.bullets.map((bullet, index) => (
              <div
                key={`${bullet}-${index}`}
                className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm leading-6 text-zinc-300"
              >
                {bullet}
              </div>
            ))}
          </div>
        ) : null}
        {message.relatedContent?.length ? (
          <div className="mt-3 rounded-md border border-emerald-300/20 bg-emerald-300/10 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-emerald-200">
              Related local records
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {message.relatedContent.map((item) => (
                <a
                  key={`${item.type}-${item.id}`}
                  href={item.href}
                  className="rounded-md border border-emerald-300/15 bg-zinc-950/70 p-3 transition-colors hover:border-emerald-300/40"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] uppercase tracking-[0.16em] text-emerald-200/80">
                      {item.type === "aiProduct" ? "AI product" : item.type}
                    </span>
                    {item.status ? (
                      <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-0.5 text-[11px] text-zinc-400">
                        {item.status}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm font-medium text-zinc-100">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-400">{item.summary}</p>
                </a>
              ))}
            </div>
          </div>
        ) : null}
        {message.sources?.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.sources.map((source) => (
              <span
                key={source}
                className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-xs text-cyan-100"
              >
                {source}
              </span>
            ))}
          </div>
        ) : null}
        {demoMode && message.debug ? (
          <div className="mt-3 rounded-md border border-amber-400/20 bg-amber-400/10 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-200">
                Developer debug view
              </p>
              <span className="text-[11px] text-amber-100/80">{message.debug.normalizedPrompt || "starter"}</span>
            </div>
            <div className="grid gap-3">
              {message.debug.modelProfile ? (
                <div>
                  <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-amber-100/70">Model profile</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="rounded-md border border-amber-300/10 bg-black/20 px-3 py-2 text-xs text-zinc-300">
                      <span className="block text-[10px] uppercase tracking-[0.16em] text-amber-100/70">Provider</span>
                      {message.debug.modelProfile.provider}
                    </div>
                    <div className="rounded-md border border-amber-300/10 bg-black/20 px-3 py-2 text-xs text-zinc-300">
                      <span className="block text-[10px] uppercase tracking-[0.16em] text-amber-100/70">Model</span>
                      {message.debug.modelProfile.model ?? "unknown"}
                    </div>
                    <div className="rounded-md border border-amber-300/10 bg-black/20 px-3 py-2 text-xs text-zinc-300">
                      <span className="block text-[10px] uppercase tracking-[0.16em] text-amber-100/70">Reasoning / Verbosity</span>
                      {`${message.debug.modelProfile.reasoningEffort ?? "default"} / ${message.debug.modelProfile.verbosity ?? "default"}`}
                    </div>
                  </div>
                </div>
              ) : null}
              <div>
                <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-amber-100/70">Matched keywords</p>
                {message.debug.matchedKeywords.length ? (
                  <div className="flex flex-wrap gap-2">
                    {message.debug.matchedKeywords.map((keyword) => (
                      <span key={keyword} className="rounded-md border border-amber-300/20 bg-black/20 px-2 py-1 text-xs text-amber-50">
                        {keyword}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400">No keywords matched.</p>
                )}
              </div>
              <div>
                <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-amber-100/70">Ranking order</p>
                {message.debug.ranking.length ? (
                  <div className="grid gap-2">
                    {message.debug.ranking.map((match, index) => (
                      <div
                        key={`${match.type}-${match.id}`}
                        className="flex items-center justify-between gap-3 rounded-md border border-amber-300/10 bg-black/20 px-3 py-2 text-xs text-zinc-300"
                      >
                        <span>
                          {index + 1}. {match.type}: {match.title}
                        </span>
                        <span className="text-amber-100">score {match.score}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400">No ranked records.</p>
                )}
              </div>
              <div>
                <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-amber-100/70">
                  Final composed sections
                </p>
                <div className="grid gap-2">
                  {message.debug.sections.map((section) => (
                    <div key={section.title} className="rounded-md border border-amber-300/10 bg-black/20 px-3 py-2">
                      <p className="text-xs font-medium text-amber-50">{section.title}</p>
                      <p className="mt-1 text-xs leading-5 text-zinc-400">{section.items.length} item(s)</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
