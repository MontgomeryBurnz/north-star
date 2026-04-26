import Link from "next/link";
import { ArrowRight, Bot, CornerDownRight, Database, LockKeyhole, MessageSquareText, Search } from "lucide-react";
import { aiProducts, assistantFaqs, frameworks, initiatives } from "@/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/section-header";

export function AssistantPreview() {
  return (
    <section id="assistant" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="North Star guide"
        title="Ask for the clearest next move."
        description="Use program context to separate noise from the plan, outputs, risks, and next step."
      />
      <div className="mt-10">
        <Card className="relative overflow-hidden bg-zinc-950/85">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />
          <CardHeader className="border-b border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-zinc-50">
                <Bot className="h-4 w-4 text-emerald-200" />
                North Star guidance layer
              </CardTitle>
              <span className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-xs text-emerald-100">
                product shell
              </span>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 p-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Program examples", value: String(initiatives.length).padStart(2, "0"), icon: Database },
                { label: "Guided prompts", value: String(assistantFaqs.length).padStart(2, "0"), icon: MessageSquareText },
                { label: "Work posture", value: "clear", icon: LockKeyhole }
              ].map((item) => (
                <div key={item.label} className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                  <item.icon className="mb-3 h-4 w-4 text-cyan-200" />
                  <p className="text-lg font-semibold text-zinc-50">{item.value}</p>
                  <p className="mt-1 text-xs text-zinc-500">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-white/10 bg-black/25 p-3">
              <div className="flex items-center gap-2 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-500">
                <Search className="h-4 w-4 text-zinc-500" />
                Ask for plan, approach, deliverables, risks, or next steps
              </div>
            </div>
            {assistantFaqs.slice(0, 4).map((faq) => (
              <div key={faq.id} className="rounded-md border border-white/10 bg-white/[0.035] p-4">
                <p className="text-sm font-medium text-zinc-100">{faq.question}</p>
                <p className="mt-2 flex gap-2 text-sm leading-6 text-zinc-400">
                  <CornerDownRight className="mt-1 h-4 w-4 shrink-0 text-emerald-200" />
                  {faq.answer}
                </p>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                <p className="text-lg font-semibold text-zinc-50">{frameworks.length}</p>
                <p className="text-xs text-zinc-500">work path models</p>
              </div>
              <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                <p className="text-lg font-semibold text-zinc-50">{aiProducts.length}</p>
                <p className="text-xs text-zinc-500">AI output surfaces</p>
              </div>
            </div>
            <Button asChild className="mt-2 w-full">
              <Link href="/assistant">
                Open work path guide
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
