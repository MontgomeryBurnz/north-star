"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginBrandMark } from "@/components/login-brand-mark";

type AuthPasswordFormProps = {
  email: string;
  initialName?: string;
  mode: "reset" | "setup";
  redirectTo?: string;
};

export function AuthPasswordForm({ email, initialName = "", mode, redirectTo = "/" }: AuthPasswordFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialName);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 10) {
      setStatus("Use at least 10 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setStatus("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    setStatus(mode === "setup" ? "Activating access..." : "Resetting password...");

    try {
      const response = await fetch("/api/auth/user/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName, password })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Could not update password.");
      }

      router.push(redirectTo);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not update password.");
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
              {mode === "setup" ? "Create your access" : "Reset your password"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 p-5">
            <div className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.055] p-3">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-200">Username</p>
              <p className="mt-1 break-all text-sm text-zinc-100">{email}</p>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4">
              {mode === "setup" ? (
                <label className="grid gap-2">
                  <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">Display name</span>
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Your name"
                    className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-300/50"
                  />
                </label>
              ) : null}

              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-300/50"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">Confirm password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-300/50"
                />
              </label>

              <Button type="submit" size="lg" disabled={isLoading}>
                {mode === "setup" ? <CheckCircle2 className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
                {isLoading ? "Saving..." : mode === "setup" ? "Activate access" : "Reset password"}
              </Button>
            </form>

            {status ? <p className="text-sm leading-6 text-zinc-400">{status}</p> : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
