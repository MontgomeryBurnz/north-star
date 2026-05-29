"use client";

import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2, GitBranch, Layers3, Sparkles } from "lucide-react";
import {
  deliveryAgentDefinitions,
  getDeliveryAgentById,
  type DeliveryAgentDefinition,
  type DeliveryAgentId
} from "@/lib/delivery-agent-types";
import type { RoleArtifactDefinition } from "@/lib/role-artifact-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AgentWorkbenchCardProps = {
  artifactDefinitions: RoleArtifactDefinition[];
  onLaunchArtifact: (definition: RoleArtifactDefinition, agent: DeliveryAgentDefinition) => void;
  onSelectAgent: (agentId: DeliveryAgentId) => void;
  selectedAgentId: DeliveryAgentId;
  selectedProgramName?: string;
};

function AgentListItem({
  agent,
  isSelected,
  onSelect
}: {
  agent: DeliveryAgentDefinition;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group grid min-h-36 rounded-lg border p-4 text-left transition-colors ${
        isSelected
          ? "border-emerald-300/45 bg-emerald-300/[0.075] text-zinc-50"
          : "border-white/10 bg-zinc-950/70 text-zinc-200 hover:border-emerald-300/30 hover:bg-emerald-300/[0.04]"
      }`}
      data-agent-card={agent.id}
    >
      <span className="flex items-start justify-between gap-3">
        <span>
          <span className="block text-[11px] font-medium uppercase tracking-[0.16em] text-cyan-100">
            {String(agent.stageOrder).padStart(2, "0")} / {agent.lifecycleStage}
          </span>
          <span className="mt-2 block text-base font-semibold leading-6">{agent.shortTitle}</span>
        </span>
        {isSelected ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-200" /> : null}
      </span>
      <span className="mt-3 line-clamp-3 text-xs leading-5 text-zinc-400">{agent.mission}</span>
      <span className="mt-4 flex flex-wrap gap-2 self-end">
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-300">
          {agent.roleLens}
        </span>
        <span className="rounded-full border border-cyan-300/15 bg-cyan-300/[0.04] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-cyan-100">
          {agent.suggestedArtifactTypes.length} outputs
        </span>
      </span>
    </button>
  );
}

function SignalList({
  icon,
  items,
  title
}: {
  icon: ReactNode;
  items: string[];
  title: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
        {icon}
        {title}
      </div>
      <ul className="mt-3 grid gap-2 text-sm leading-6 text-zinc-400">
        {items.slice(0, 4).map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300/80" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HandoffPill({ agentId }: { agentId: DeliveryAgentId }) {
  const agent = getDeliveryAgentById(agentId);

  return (
    <span className="rounded-full border border-white/10 bg-zinc-950 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-300">
      {agent.shortTitle}
    </span>
  );
}

export function AgentWorkbenchCard({
  artifactDefinitions,
  onLaunchArtifact,
  onSelectAgent,
  selectedAgentId,
  selectedProgramName
}: AgentWorkbenchCardProps) {
  const selectedAgent = getDeliveryAgentById(selectedAgentId);
  const artifactByType = new Map(artifactDefinitions.map((definition) => [definition.type, definition]));
  const suggestedArtifacts = selectedAgent.suggestedArtifactTypes
    .map((artifactType) => artifactByType.get(artifactType))
    .filter((definition): definition is RoleArtifactDefinition => Boolean(definition));

  return (
    <Card className="bg-zinc-950/75" data-agent-workbench>
      <CardHeader className="border-b border-white/10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">Agent Workbench</p>
            <CardTitle className="mt-2 text-zinc-50">Run the delivery lifecycle through specialist agents.</CardTitle>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Agents convert program signal into governed handoffs and work products. Pick the domain that should move next.
            </p>
          </div>
          <div className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.06] px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-emerald-100">
            {selectedProgramName ?? "Program scoped"}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {deliveryAgentDefinitions.map((agent) => (
            <AgentListItem
              key={agent.id}
              agent={agent}
              isSelected={agent.id === selectedAgent.id}
              onSelect={() => onSelectAgent(agent.id)}
            />
          ))}
        </div>

        <section
          className="grid gap-4 rounded-lg border border-emerald-300/20 bg-emerald-300/[0.035] p-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
          data-agent-selected={selectedAgent.id}
        >
          <div className="grid gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-200">{selectedAgent.lifecycleStage}</p>
              <h3 className="mt-2 text-xl font-semibold text-zinc-50">{selectedAgent.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-300">{selectedAgent.mission}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-zinc-950/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-300">
                Role lens: {selectedAgent.roleLens}
              </span>
              {selectedAgent.handoffTo.map((agentId) => (
                <HandoffPill key={agentId} agentId={agentId} />
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <SignalList
                title="Receives"
                icon={<Layers3 className="h-4 w-4 text-cyan-100" />}
                items={selectedAgent.receives}
              />
              <SignalList
                title="Produces"
                icon={<GitBranch className="h-4 w-4 text-emerald-100" />}
                items={selectedAgent.produces}
              />
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-lg border border-white/10 bg-zinc-950/75 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                <Sparkles className="h-4 w-4 text-emerald-100" />
                Suggested agent outputs
              </div>
              <div className="mt-3 grid gap-2">
                {suggestedArtifacts.map((definition) => (
                  <Button
                    key={definition.type}
                    type="button"
                    variant="outline"
                    className="h-auto justify-between gap-3 whitespace-normal px-3 py-3 text-left"
                    onClick={() => onLaunchArtifact(definition, selectedAgent)}
                    data-agent-output={definition.type}
                  >
                    <span>
                      <span className="block text-sm font-semibold">{definition.shortTitle}</span>
                      <span className="mt-1 line-clamp-2 block text-xs leading-5 text-zinc-500">{definition.description}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </Button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-cyan-300/15 bg-cyan-300/[0.035] p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-100">Readiness prompts</p>
              <div className="mt-3 grid gap-2 text-sm leading-6 text-zinc-300">
                {selectedAgent.missingInputPrompts.map((prompt) => (
                  <p key={prompt} className="rounded-md border border-white/10 bg-zinc-950/60 px-3 py-2">
                    {prompt}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
