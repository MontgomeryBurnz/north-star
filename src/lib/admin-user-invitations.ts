import "server-only";
import type { ManagedAppUser } from "@/lib/admin-user-types";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/server";

export type InvitationProviderStatus = {
  configured: boolean;
  provider: "supabase";
};

export type ManagedUserInvitationResult =
  | {
      ok: true;
      authUserId?: string;
      invitedAt: string;
    }
  | {
      ok: false;
      error: string;
    };

export function getInvitationProviderStatus(): InvitationProviderStatus {
  return {
    configured: isSupabaseAdminConfigured(),
    provider: "supabase"
  };
}

export async function inviteManagedUser(user: ManagedAppUser, requestUrl: string): Promise<ManagedUserInvitationResult> {
  if (!isSupabaseAdminConfigured()) {
    return {
      ok: false,
      error: "Supabase service-role invitations are not configured."
    };
  }

  const origin = new URL(requestUrl).origin;
  const redirectTo = new URL("/auth/callback", origin);
  redirectTo.searchParams.set("next", "/");

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(user.email, {
    redirectTo: redirectTo.toString(),
    data: {
      northStarManagedUserId: user.id,
      northStarUserType: user.userType
    }
  });

  if (error) {
    return {
      ok: false,
      error: error.message || "Supabase could not send the invitation."
    };
  }

  return {
    ok: true,
    authUserId: data.user?.id,
    invitedAt: data.user?.invited_at ?? data.user?.confirmation_sent_at ?? new Date().toISOString()
  };
}
