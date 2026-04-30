"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginBrandMark } from "@/components/login-brand-mark";

export function SiteAccessLoginForm({
  authError,
  requireUserAuth = false,
  redirectTo,
  userAuthEnabled
}: {
  authError?: "expired";
  requireUserAuth?: boolean;
  redirectTo: string;
  userAuthEnabled: boolean;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [authMode, setAuthMode] = useState<"alpha" | "user">(userAuthEnabled || requireUserAuth ? "user" : "alpha");
  const [showRecovery, setShowRecovery] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleAlphaSubmit(event: FormEvent<HTMLFormElement>) {
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
      const payload = (await response.json()) as { redirectTo?: string };
      router.push(payload.redirectTo ?? redirectTo);
      router.refresh();
    } catch {
      setStatus("Could not grant access. Check the shared alpha password.");
      setIsLoading(false);
    }
  }

  async function handleUserSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setStatus("Signing in...");

    try {
      const response = await fetch("/api/auth/user/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: userEmail, password: userPassword })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Could not sign in.");
      }

      const payload = (await response.json()) as { redirectTo?: string };
      router.push(payload.redirectTo ?? redirectTo);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not sign in.");
      setIsLoading(false);
    }
  }

  async function handleRecoverySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setStatus("Sending recovery instructions...");

    try {
      const response = await fetch("/api/auth/user/recover", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: recoveryEmail })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Could not start recovery.");
      }

      setStatus("If an active account exists for that email, recovery instructions have been sent.");
      setIsLoading(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not start recovery.");
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
              North Star access
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 p-5">
            {authError === "expired" ? (
              <div className="rounded-md border border-amber-300/25 bg-amber-300/[0.07] p-3 text-sm leading-6 text-amber-100">
                That setup or recovery link is invalid or has expired. Ask an Admin to resend the invitation, or use reset access below.
              </div>
            ) : null}

            {requireUserAuth && !userAuthEnabled ? (
              <div className="rounded-md border border-amber-300/25 bg-amber-300/[0.07] p-3 text-sm leading-6 text-amber-100">
                User account login is required for this page, but Supabase user auth is not configured.
              </div>
            ) : null}

            {requireUserAuth && userAuthEnabled ? (
              <div className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.055] p-3 text-sm leading-6 text-zinc-300">
                Use your North Star username and password. Access to this page is based on your assigned user type.
              </div>
            ) : null}

            {userAuthEnabled && !requireUserAuth ? (
              <div className="grid grid-cols-2 gap-2 rounded-md border border-white/10 bg-black/20 p-1">
                {[
                  ["user", "User login"],
                  ["alpha", "Alpha password"]
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setAuthMode(value as "alpha" | "user");
                      setShowRecovery(false);
                      setStatus(null);
                    }}
                    className={`rounded px-3 py-2 text-sm font-medium transition-colors ${
                      authMode === value
                        ? "bg-emerald-300 text-emerald-950"
                        : "text-zinc-400 hover:bg-white/[0.055] hover:text-zinc-100"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}

            {requireUserAuth && !userAuthEnabled ? null : authMode === "user" && userAuthEnabled ? (
              <div className="grid gap-4">
                <div className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.055] p-3">
                  <p className="flex items-center gap-2 text-sm font-medium text-emerald-100">
                    <Sparkles className="h-4 w-4" />
                    Invited users sign in here.
                  </p>
                  <p className="mt-1 text-xs leading-5 text-zinc-400">
                    Use the email address from your invitation as your username.
                  </p>
                </div>

                <form onSubmit={handleUserSubmit} className="grid gap-4">
                  <label className="grid gap-2">
                    <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">Email / username</span>
                    <input
                      type="email"
                      value={userEmail}
                      onChange={(event) => setUserEmail(event.target.value)}
                      className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-300/50"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">Password</span>
                    <input
                      type="password"
                      value={userPassword}
                      onChange={(event) => setUserPassword(event.target.value)}
                      className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-300/50"
                    />
                  </label>
                  <Button type="submit" size="lg" disabled={isLoading}>
                    <LockKeyhole className="h-4 w-4" />
                    {isLoading ? "Signing in..." : "Sign in"}
                  </Button>
                </form>

                <button
                  type="button"
                  onClick={() => {
                    setShowRecovery((current) => !current);
                    setStatus(null);
                  }}
                  className="text-left text-sm font-medium text-emerald-200 transition-colors hover:text-emerald-100"
                >
                  Reset username or password
                </button>

                {showRecovery ? (
                  <form onSubmit={handleRecoverySubmit} className="grid gap-3 rounded-md border border-cyan-300/20 bg-cyan-300/[0.045] p-3">
                    <label className="grid gap-2">
                      <span className="text-xs font-medium uppercase tracking-[0.16em] text-cyan-100">Invite email</span>
                      <input
                        type="email"
                        value={recoveryEmail}
                        onChange={(event) => setRecoveryEmail(event.target.value)}
                        placeholder="name@company.com"
                        className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
                      />
                    </label>
                    <Button type="submit" variant="secondary" disabled={isLoading}>
                      <Mail className="h-4 w-4" />
                      Send reset link
                    </Button>
                  </form>
                ) : null}
              </div>
            ) : (
              <form onSubmit={handleAlphaSubmit} className="grid gap-4">
                <label className="grid gap-2">
                  <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">Enter Alpha Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-300/50"
                  />
                </label>
                <Button type="submit" size="lg" disabled={isLoading}>
                  {authMode === "alpha" ? <KeyRound className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
                  {isLoading ? "Unlocking..." : "Enter alpha"}
                </Button>
              </form>
            )}
            {status ? <p className="text-sm leading-6 text-zinc-400">{status}</p> : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
