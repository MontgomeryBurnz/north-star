"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginBrandMark } from "@/components/login-brand-mark";

export function SiteAccessLoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setStatus("Checking access...");

    try {
      const response = await fetch("/api/auth/site-access/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password })
      });

      if (!response.ok) throw new Error("Access denied.");
      router.push(redirectTo);
      router.refresh();
    } catch {
      setStatus("Could not grant access. Check the shared alpha password.");
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-7xl items-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(24rem,30rem)] lg:items-center">
        <LoginBrandMark
          title="Find True North"
          subtitle="Where people, intelligence, and data move as one."
        />
        <Card className="w-full bg-zinc-950/85">
          <CardHeader className="border-b border-white/10">
          <CardTitle className="flex items-center gap-2 text-zinc-50">
            <ShieldCheck className="h-4 w-4 text-emerald-200" />
            Private alpha access
          </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 p-5">
            <p className="text-sm leading-6 text-zinc-400">
              This environment is gated because it can consume paid API credits and contain internal program context, artifacts, guidance, and leadership signal.
            </p>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">Shared alpha password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-300/50"
                />
              </label>
              <Button type="submit" size="lg" disabled={isLoading}>
                <LockKeyhole className="h-4 w-4" />
                {isLoading ? "Unlocking..." : "Enter alpha"}
              </Button>
            </form>
            {status ? <p className="text-sm leading-6 text-zinc-400">{status}</p> : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
