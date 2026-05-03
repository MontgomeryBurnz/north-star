import Link from "next/link";
import { ArrowRight, ClipboardList, FilePlus2, Gauge, Layers3 } from "lucide-react";
import { ActiveProgramReviewSection } from "@/components/active-program-review-section";
import { ProductPageHeader } from "@/components/product-page-header";
import { ProgramIntakeSection } from "@/components/program-intake-section";
import { Button } from "@/components/ui/button";

type ProgramWorkspaceMode = "manage" | "setup";

const programHubEntries = [
  {
    id: "setup" as const,
    icon: FilePlus2,
    label: "Set Up New Program",
    href: "/active-program?mode=setup",
    description: "Create the program record, upload starting context, define roles, and generate the first guidance loop.",
    outcomes: ["Program intake", "Source artifacts", "Team roles", "Initial guidance"]
  },
  {
    id: "manage" as const,
    icon: ClipboardList,
    label: "Manage Active Program",
    href: "/active-program?mode=manage",
    description: "Review delivery posture, capture role signals, inspect risks and decisions, and keep the cockpit current.",
    outcomes: ["Program cockpit", "Role signals", "Risk and decisions", "Weekly timeline"]
  }
];

const workspaceCopy: Record<ProgramWorkspaceMode, { description: string; title: string }> = {
  manage: {
    title: "What changed, who owns it, and what needs action?",
    description:
      "Manage the active program cockpit, role updates, meeting inputs, risks, decisions, and weekly delivery signal."
  },
  setup: {
    title: "Set up the program foundation.",
    description:
      "Create the starting record, define outcomes and roles, upload source context, and give North Star enough signal to generate initial guidance."
  }
};

export function ProgramWorkspace({ initialMode = null }: { initialMode?: ProgramWorkspaceMode | null }) {
  if (!initialMode) {
    return <ProgramHubLanding />;
  }

  const mode = initialMode;
  const alternateMode = mode === "setup" ? "manage" : "setup";
  const alternateLabel = mode === "setup" ? "Manage active program" : "Set up new program";

  return (
    <main>
      <section className="border-b border-white/10 bg-white/[0.015]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <ProductPageHeader
            eyebrow="Program Hub"
            title={workspaceCopy[mode].title}
            description={workspaceCopy[mode].description}
            actions={
              <div className="grid gap-2 rounded-md border border-white/10 bg-zinc-950/70 p-2 sm:grid-cols-2">
                <Button asChild variant="outline" size="lg" className="justify-start border-white/10 bg-white/[0.03]">
                  <Link href="/active-program">Program Hub home</Link>
                </Button>
                <Button asChild size="lg" className="justify-start">
                  <Link href={`/active-program?mode=${alternateMode}`}>{alternateLabel}</Link>
                </Button>
              </div>
            }
          />
        </div>
      </section>

      {mode === "setup" ? <ProgramIntakeSection /> : <ActiveProgramReviewSection />}
    </main>
  );
}

function ProgramHubLanding() {
  return (
    <main data-program-hub-landing>
      <section className="border-b border-white/10 bg-white/[0.015]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <ProductPageHeader
            eyebrow="Program Hub"
            title="Choose the right program path."
            description="Start with the job you need to do. Set up a new program when the record and source context do not exist yet, or manage an active program when the team is already executing."
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-2">
          {programHubEntries.map((entry) => (
            <Link
              key={entry.id}
              href={entry.href}
              data-program-hub-entry={entry.id}
              className="group grid min-h-[320px] rounded-lg border border-white/10 bg-zinc-950/80 p-5 transition-colors hover:border-emerald-300/35 hover:bg-emerald-300/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/50 md:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-md border border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-100">
                  <entry.icon className="h-5 w-5" />
                </span>
                <ArrowRight className="h-5 w-5 text-zinc-500 transition-transform group-hover:translate-x-1 group-hover:text-emerald-200" />
              </div>

              <div className="mt-8">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">
                  {entry.id === "setup" ? "Program creation" : "Execution cockpit"}
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-normal text-zinc-50">{entry.label}</h2>
                <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-400">{entry.description}</p>
              </div>

              <div className="mt-8 grid gap-2 sm:grid-cols-2">
                {entry.outcomes.map((outcome) => (
                  <span
                    key={outcome}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs font-medium text-zinc-300"
                  >
                    {entry.id === "setup" ? (
                      <Layers3 className="h-3.5 w-3.5 text-emerald-200" />
                    ) : (
                      <Gauge className="h-3.5 w-3.5 text-cyan-200" />
                    )}
                    {outcome}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
