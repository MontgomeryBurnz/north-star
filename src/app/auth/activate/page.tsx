import { redirect } from "next/navigation";
import { AuthActivationForm } from "@/components/auth-activation-form";

const supportedTypes = new Set(["email", "invite", "magiclink", "recovery", "signup"]);

function getSafeNextPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/auth/setup";
  return value;
}

export default async function AuthActivatePage({
  searchParams
}: {
  searchParams: Promise<{
    email?: string;
    next?: string;
    token?: string;
    token_hash?: string;
    type?: string;
  }>;
}) {
  const params = await searchParams;
  const tokenType = params.type ?? "";
  const tokenHash = params.token_hash ?? "";
  const token = params.token ?? "";

  if (!supportedTypes.has(tokenType) || (!tokenHash && !token)) {
    redirect("/login?authError=expired");
  }

  const nextPath = getSafeNextPath(
    tokenType === "recovery"
      ? "/auth/reset-password"
      : params.next
  );

  return (
    <AuthActivationForm
      email={params.email}
      mode={tokenType === "recovery" ? "recovery" : "setup"}
      nextPath={nextPath}
      token={token}
      tokenHash={tokenHash}
      tokenType={tokenType}
    />
  );
}
