"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Bot, Gauge, Send, Sparkles, UserRound } from "lucide-react";
import { getAssistantApiResponse } from "@/lib/assistant-client";
import type {
  AssistantMessageInput,
  AssistantProviderId,
  AssistantRelatedItem,
  AssistantResponse,
  AssistantSection,
  MatchedContent
} from "@/lib/assistant-types";
import type { AssistantConversationTurn } from "@/lib/assistant-conversation-types";
import type { StoredProgram } from "@/lib/program-intake-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AssistantBriefing } from "@/lib/assistant-briefing";

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
  content: "Select an active program, then give me the delivery context. I will stay inside that program and help shape the plan, risks, outputs, and next move.",
  sections: [
    {
      title: "Work Path Surface",
      items: [
        "Separate the signal from the noise.",
        "Clarify what matters now: plan, owners, risks, outputs, or decisions.",
        "Use the assistant to capture delivery context that should influence the next guided-plan refresh."
      ]
    }
  ],
  sources: ["Local assistant content"],
  mode: "direct",
  matches: []
};

function buildSuggestedPrompts(programName?: string) {
  const label = programName || "this program";
  return [
    `What should I focus on for ${label}?`,
    `What are the top risks on ${label}?`,
    `What decisions are still needed for ${label}?`,
    `How should I guide Product, BA, UX, Engineering, Data, and Change on ${label}?`
  ];
}

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
    provider: response.provider
  };
}

function conversationToTurn(conversation: AssistantConversationTurn): ConversationTurn {
  return {
    id: conversation.id,
    user: {
      id: `${conversation.id}-user`,
      role: "user",
      content: conversation.prompt
    },
    assistant: responseToMessage(conversation.response)
  };
}

export function AssistantChat() {
  const [programs, setPrograms] = useState<StoredProgram[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [assistantBriefing, setAssistantBriefing] = useState<AssistantBriefing | null>(null);

  const selectedProgram = useMemo(
    () => programs.find((program) => program.id === selectedProgramId) ?? null,
    [programs, selectedProgramId]
  );
  const suggestedPrompts = useMemo(
    () => assistantBriefing?.promptChips?.length ? assistantBriefing.promptChips : buildSuggestedPrompts(selectedProgram?.intake.programName),
    [assistantBriefing?.promptChips, selectedProgram?.intake.programName]
  );
  const strategicPrompts = useMemo(
    () => assistantBriefing?.promptQueue?.length ? assistantBriefing.promptQueue : buildSuggestedPrompts(selectedProgram?.intake.programName),
    [assistantBriefing?.promptQueue, selectedProgram?.intake.programName]
  );
  const latestAssistantMessage = turns.length ? turns[turns.length - 1]?.assistant : undefined;
  const activeModelName = assistantBriefing?.model ?? "gpt-5.5";
  const understandingScore = assistantBriefing?.understandingScore ?? 0;
  const understandingLabel =
    understandingScore >= 80 ? "Strong" : understandingScore >= 60 ? "Working" : "Needs more context";

  useEffect(() => {
    let ignore = false;

    async function loadPrograms() {
      const response = await fetch("/api/programs", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as { programs: StoredProgram[] };
      if (ignore) return;
      setPrograms(payload.programs);
      setSelectedProgramId((current) => current || payload.programs[0]?.id || "");
    }

    void loadPrograms();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadAssistantConversations() {
      if (!selectedProgramId) {
        setTurns([]);
        setAssistantBriefing(null);
        return;
      }

      const [conversationResponse, briefingResponse] = await Promise.all([
        fetch(`/api/programs/${selectedProgramId}/assistant-conversations`, { cache: "no-store" }),
        fetch(`/api/programs/${selectedProgramId}/assistant-briefing`, { cache: "no-store" })
      ]);
      if (!conversationResponse.ok || !briefingResponse.ok) return;
      const payload = (await conversationResponse.json()) as { conversations: AssistantConversationTurn[] };
      const briefingPayload = (await briefingResponse.json()) as { briefing: AssistantBriefing };
      if (ignore) return;
      setTurns(payload.conversations.reverse().map(conversationToTurn));
      setAssistantBriefing(briefingPayload.briefing);
    }

    void loadAssistantConversations();

    return () => {
      ignore = true;
    };
  }, [selectedProgramId]);

  async function submitPrompt(prompt: string) {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isThinking || !selectedProgramId) return;

    const turnId = `turn-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmedPrompt
    };

    setInput("");
    setIsThinking(true);
    setTurns((current) => [...current, { id: turnId, user: userMessage }]);

    const history: AssistantMessageInput[] = turns.flatMap((turn) =>
      turn.assistant
        ? [
            { role: "user" as const, content: turn.user.content },
            { role: "assistant" as const, content: turn.assistant.content }
          ]
        : [{ role: "user" as const, content: turn.user.content }]
    );

    await new Promise((resolve) => window.setTimeout(resolve, 360));
    const response = await getAssistantApiResponse(trimmedPrompt, undefined, selectedProgramId, history);
    const assistantMessage = responseToMessage(response);
    setTurns((current) =>
      current.map((turn) => (turn.id === turnId ? { ...turn, assistant: assistantMessage } : turn))
    );
    setIsThinking(false);

    const briefingResponse = await fetch(`/api/programs/${selectedProgramId}/assistant-briefing`, { cache: "no-store" });
    if (briefingResponse.ok) {
      const briefingPayload = (await briefingResponse.json()) as { briefing: AssistantBriefing };
      setAssistantBriefing(briefingPayload.briefing);
    }
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
            </div>
          </div>
        </div>

        <div className="grid min-h-[650px] grid-rows-[auto_1fr_auto]">
          <div className="border-b border-white/10 bg-white/[0.025] p-4">
            <div className="mb-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_280px] md:items-end">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Active program context</p>
                <p className="mt-1 text-xs text-zinc-600">
                  The assistant should stay inside the selected saved program and use its uploads, updates, leadership feedback, and guided plan as grounding.
                </p>
              </div>
              <label className="grid gap-2 rounded-md border border-white/10 bg-zinc-950/70 p-3 text-xs text-zinc-500">
                <span className="uppercase tracking-[0.18em]">Program</span>
                <select
                  value={selectedProgramId}
                  onChange={(event) => setSelectedProgramId(event.target.value)}
                  className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-300/40"
                >
                  <option value="">Select a saved program</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.intake.programName}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Prompt chips</p>
              <p className="text-xs text-zinc-600">
                {selectedProgram ? "OpenAI-generated leading questions" : "select a program first"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void submitPrompt(prompt)}
                  disabled={!selectedProgramId}
                  className="rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-left text-xs text-zinc-300 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300/40 hover:text-zinc-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[58vh] space-y-4 overflow-y-auto p-5">
            <AssistantMessage message={starterMessage} />
            {turns.map((turn) => (
              <div key={turn.id} className="animate-[fadeIn_260ms_ease-out_both] space-y-3">
                <UserMessage message={turn.user} />
                {turn.assistant ? <AssistantMessage message={turn.assistant} /> : null}
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
                placeholder={selectedProgramId ? "Ask about the selected program, risk, decision, role, or next output..." : "Select an active program first..."}
                className="min-h-11 flex-1 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-300/50"
              />
              <Button type="submit" aria-label="Send prompt" disabled={isThinking || !selectedProgramId}>
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
            <div className="grid gap-2 rounded-md border border-white/10 bg-white/[0.035] p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-400">Model</span>
                <span className="text-zinc-100">{activeModelName}</span>
              </div>
            </div>
            <div className="grid gap-2 rounded-md border border-white/10 bg-white/[0.035] p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-400">Reasoning</span>
                <span className="text-zinc-100">{understandingScore}%</span>
              </div>
              <div className="h-2 rounded-full bg-zinc-900">
                <div
                  className={`h-full rounded-full ${
                    understandingScore >= 80 ? "bg-emerald-300" : understandingScore >= 60 ? "bg-cyan-300" : "bg-amber-300"
                  }`}
                  style={{ width: `${understandingScore}%` }}
                />
              </div>
              <p className="text-xs leading-5 text-zinc-400">
                {understandingLabel}. {assistantBriefing?.understandingSummary ?? "More program context improves guidance quality."}
              </p>
            </div>
            <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.035] p-3">
              <span className="text-zinc-400">Selected program</span>
              <span className="text-zinc-100">{selectedProgram?.intake.programName ?? "Not selected"}</span>
            </div>
            <div className="rounded-md border border-cyan-300/20 bg-cyan-300/10 p-3 text-xs leading-5 text-cyan-100">
              OpenAI is grounded to the selected program and should use uploads, updates, leadership feedback, and dialogue as the operating context.
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
            {strategicPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void submitPrompt(prompt)}
                disabled={!selectedProgramId}
                className="rounded-md border border-white/10 bg-white/[0.035] p-3 text-left text-sm leading-6 text-zinc-300 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300/30 hover:text-zinc-50"
              >
                {prompt}
              </button>
            ))}
          </CardContent>
        </Card>
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

function AssistantMessage({ message }: { message: ChatMessage }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[88%] rounded-lg border border-white/10 bg-white/[0.035] p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            <Bot className="h-3.5 w-3.5 text-cyan-200" />
            Assistant
            {message.provider ? <span className="text-zinc-600">{message.provider}</span> : null}
          </div>
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
      </div>
    </div>
  );
}
