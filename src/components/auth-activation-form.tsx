"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginBrandMark } from "@/components/login-brand-mark";

type AuthActivationFormProps = {
  email?: string;
  mode: "recovery" | "setup";
  nextPath: string;
  token?: string;
  tokenHash?: string;
  tokenType: string;
};

export function AuthActivationForm({ email = "", mode, nextPath, token = "", tokenHash = "", tokenType }: AuthActivationFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setStatus(mode === "setup" ? "Preparing password setup..." : "Preparing password reset...");

    try {
      const response = await fetch("/api/auth/user/activate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          nextPath,
          token,
          tokenHash,
          type: tokenType
        })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "This secure link could not be activated.");
      }

      const payload = (await response.json()) as { redirectTo?: string };
      router.replace(payload.redirectTo ?? nextPath);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "This secure link could not be activated.");
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-7xl items-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(24rem,30rem)] lg:items-center">
        <LoginBrandMark
          title={mode === "setup" ? "Activate North Star" : "Reset North Star"}
          subtitle="Where people, intelligence, and data move as one."
        />
        <Card className="w-full bg-zinc-950/85">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex items-center gap-2 text-zinc-50">
              <ShieldCheck className="h-4 w-4 text-emerald-200" />
              {mode === "setup" ? "Confirm secure access" : "Confirm reset link"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 p-5">
            <div className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.055] p-3 text-sm leading-6 text-zinc-300">
              This step protects your setup link from email scanners. Continue when you are ready to create or reset your password.
            </div>

            {email ? (
              <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-200">Username</p>
                <p className="mt-1 break-all text-sm text-zinc-100">{email}</p>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="grid gap-4">
              <Button type="submit" size="lg" disabled={isLoading}>
                <CheckCircle2 className="h-4 w-4" />
                {isLoading ? "Confirming..." : mode === "setup" ? "Continue to password setup" : "Continue to reset"}
              </Button>
            </form>

            {status ? <p className="text-sm leading-6 text-zinc-400">{status}</p> : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
