import "server-only";
import type { ManagedAppUser } from "@/lib/admin-user-types";
import {
  buildNorthStarInviteEmail,
  buildNorthStarInviteText,
  getNorthStarEmailDeliveryStatus,
  sendNorthStarEmail
} from "@/lib/north-star-auth-emails";
import { buildPublicAppUrl } from "@/lib/public-origin";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/server";

export type InvitationProviderStatus = {
  brandedEmail: ReturnType<typeof getNorthStarEmailDeliveryStatus>;
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

export type ManagedUserSetupLinkResult =
  | {
      ok: true;
      authUserId?: string;
      invitedAt: string;
      setupUrl: string;
      type: "invite" | "recovery";
    }
  | {
      ok: false;
      error: string;
    };

export function getInvitationProviderStatus(): InvitationProviderStatus {
  const brandedEmail = getNorthStarEmailDeliveryStatus();

  return {
    brandedEmail,
    configured: isSupabaseAdminConfigured(),
    emailDelivery: brandedEmail.configured ? "north-star-branded" : "supabase-default",
    provider: "supabase"
  };
}

async function generateSetupLink({
  request,
  type,
  user
}: {
  request: Request;
  type: "invite" | "recovery";
  user: ManagedAppUser;
}): Promise<ManagedUserSetupLinkResult> {
  const redirectTo = buildPublicAppUrl("/auth/callback", request);
  redirectTo.searchParams.set("next", "/auth/setup");

  const supabase = createSupabaseAdminClient();
  const { data, error } = type === "invite"
    ? await supabase.auth.admin.generateLink({
        email: user.email,
        options: {
          data: {
            full_name: user.name,
            northStarManagedUserId: user.id,
            northStarUserType: user.userType
          },
          redirectTo: redirectTo.toString()
        },
        type
      })
    : await supabase.auth.admin.generateLink({
        email: user.email,
        options: {
          redirectTo: redirectTo.toString()
        },
        type
      });

  if (error || !data.properties?.action_link) {
    return {
      ok: false,
      error: error?.message || "Supabase could not generate the setup link."
    };
  }

  const setupUrl = data.properties.hashed_token
    ? buildSupabaseTokenCallbackUrl({
        nextPath: "/auth/setup",
        request,
        tokenHash: data.properties.hashed_token,
        type
      })
    : data.properties.action_link;

  return {
    ok: true,
    authUserId: data.user?.id,
    invitedAt: data.user?.invited_at ?? data.user?.confirmation_sent_at ?? new Date().toISOString(),
    setupUrl,
    type
  };
}

export async function createManagedUserSetupLink(user: ManagedAppUser, request: Request): Promise<ManagedUserSetupLinkResult> {
  if (!isSupabaseAdminConfigured()) {
    return {
      ok: false,
      error: "Supabase service-role invitations are not configured."
    };
  }

  const inviteLink = await generateSetupLink({ request, type: "invite", user });
  if (inviteLink.ok) return inviteLink;

  if (/already|registered|exists/i.test(inviteLink.error)) {
    return generateSetupLink({ request, type: "recovery", user });
  }

  return inviteLink;
}

export async function inviteManagedUser(user: ManagedAppUser, request: Request): Promise<ManagedUserInvitationResult> {
  if (!isSupabaseAdminConfigured()) {
    return {
      ok: false,
      error: "Supabase service-role invitations are not configured."
    };
  }

  const redirectTo = buildPublicAppUrl("/auth/callback", request);
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

    const actionUrl = data.properties.hashed_token
      ? buildSupabaseTokenCallbackUrl({
          nextPath: "/auth/setup",
          request,
          tokenHash: data.properties.hashed_token,
          type: "invite"
        })
      : data.properties.action_link;

    try {
      await sendNorthStarEmail({
        html: buildNorthStarInviteEmail({
          actionUrl,
          recipientEmail: user.email,
          recipientName: user.name
        }),
        subject: "Activate your North Star access",
        text: buildNorthStarInviteText({
          actionUrl,
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

function buildSupabaseTokenCallbackUrl({
  nextPath,
  request,
  tokenHash,
  type
}: {
  nextPath: string;
  request: Request;
  tokenHash: string;
  type: "invite" | "recovery";
}) {
  const callbackUrl = buildPublicAppUrl("/auth/callback", request);
  callbackUrl.searchParams.set("token_hash", tokenHash);
  callbackUrl.searchParams.set("type", type);
  callbackUrl.searchParams.set("next", nextPath);
  return callbackUrl.toString();
}
