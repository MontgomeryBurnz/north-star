import "server-only";
import type { ManagedAppUser } from "@/lib/admin-user-types";
import {
  buildNorthStarInviteEmail,
  buildNorthStarInviteText,
  getNorthStarEmailDeliveryStatus,
  sendNorthStarEmail
} from "@/lib/north-star-auth-emails";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/server";

export type InvitationProviderStatus = {
  configured: boolean;
  emailDelivery: "north-star-branded" | "supabase-default";
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
    emailDelivery: getNorthStarEmailDeliveryStatus().configured ? "north-star-branded" : "supabase-default",
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
  redirectTo.searchParams.set("next", "/auth/setup");

  const supabase = createSupabaseAdminClient();

  if (getNorthStarEmailDeliveryStatus().configured) {
    const { data, error } = await supabase.auth.admin.generateLink({
      email: user.email,
      options: {
        data: {
          full_name: user.name,
          northStarManagedUserId: user.id,
          northStarUserType: user.userType
        },
        redirectTo: redirectTo.toString()
      },
      type: "invite"
    });

    if (error || !data.properties?.action_link) {
      return {
        ok: false,
        error: error?.message || "Supabase could not generate the invitation link."
      };
    }

    try {
      await sendNorthStarEmail({
        html: buildNorthStarInviteEmail({
          actionUrl: data.properties.action_link,
          recipientEmail: user.email,
          recipientName: user.name
        }),
        subject: "Activate your North Star access",
        text: buildNorthStarInviteText({
          actionUrl: data.properties.action_link,
          recipientEmail: user.email,
          recipientName: user.name
        }),
        to: user.email
      });
    } catch (emailError) {
      return {
        ok: false,
        error: emailError instanceof Error ? emailError.message : "North Star invitation email could not be sent."
      };
    }

    return {
      ok: true,
      authUserId: data.user?.id,
      invitedAt: data.user?.invited_at ?? data.user?.confirmation_sent_at ?? new Date().toISOString()
    };
  }

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(user.email, {
    redirectTo: redirectTo.toString(),
    data: {
      full_name: user.name,
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
