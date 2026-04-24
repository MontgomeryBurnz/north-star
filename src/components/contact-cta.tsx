import Link from "next/link";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ContactCTA() {
  return (
    <section id="contact" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(16,185,129,0.14),rgba(255,255,255,0.035)_45%,rgba(34,211,238,0.11))] p-8 md:p-12">
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-emerald-200">Contact</p>
            <h2 className="mt-3 text-3xl font-semibold text-zinc-50">Bring a system-level problem.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300">
              Start with the constraint: decision loop, customer friction, AI product bet, or leadership cadence.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="mailto:hello@example.com">
              <Mail className="h-4 w-4" />
              Start a conversation
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
