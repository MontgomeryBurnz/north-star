export type NorthStarEmailInput = {
  actionLabel: string;
  actionUrl: string;
  body: string;
  eyebrow: string;
  preview: string;
  title: string;
};

export type NorthStarInviteEmailInput = {
  actionUrl: string;
  recipientEmail: string;
  recipientName: string;
};

export type NorthStarRecoveryEmailInput = {
  actionUrl: string;
  recipientEmail: string;
};

type SendNorthStarEmailInput = {
  html: string;
  subject: string;
  text: string;
  to: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function getNorthStarEmailDeliveryStatus() {
  return {
    configured: Boolean(process.env.RESEND_API_KEY && process.env.NORTHSTAR_EMAIL_FROM),
    provider: "resend" as const
  };
}

export function buildNorthStarAuthEmail(input: NorthStarEmailInput) {
  const safeActionLabel = escapeHtml(input.actionLabel);
  const safeActionUrl = escapeHtml(input.actionUrl);
  const safeBody = escapeHtml(input.body);
  const safeEyebrow = escapeHtml(input.eyebrow);
  const safePreview = escapeHtml(input.preview);
  const safeTitle = escapeHtml(input.title);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;background:#050708;color:#f8fafc;font-family:Inter,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${safePreview}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050708;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;overflow:hidden;border:1px solid rgba(110,231,183,0.26);border-radius:20px;background:#090d0f;">
            <tr>
              <td style="padding:34px 32px 26px;background:linear-gradient(135deg,#07130f 0%,#10231b 48%,#042f2e 100%);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td>
                      <div style="display:inline-block;border:1px solid rgba(167,243,208,0.4);border-radius:14px;background:rgba(16,185,129,0.16);padding:12px 14px;color:#a7f3d0;font-size:18px;font-weight:800;letter-spacing:0.08em;">N</div>
                    </td>
                    <td align="right" style="color:#a7f3d0;font-size:12px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;">North Star</td>
                  </tr>
                </table>
                <p style="margin:28px 0 12px;color:#67e8f9;font-size:12px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;">${safeEyebrow}</p>
                <h1 style="margin:0;color:#ffffff;font-size:34px;line-height:1.08;letter-spacing:-0.02em;">${safeTitle}</h1>
                <p style="margin:18px 0 0;color:#cbd5e1;font-size:16px;line-height:1.7;">${safeBody}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 32px;background:#090d0f;">
                <a href="${safeActionUrl}" style="display:inline-block;border-radius:12px;background:#34d399;color:#022c22;font-size:15px;font-weight:800;text-decoration:none;padding:14px 20px;">${safeActionLabel}</a>
                <p style="margin:22px 0 0;color:#94a3b8;font-size:13px;line-height:1.7;">If the button does not work, copy and paste this secure link into your browser:</p>
                <p style="margin:8px 0 0;word-break:break-all;color:#67e8f9;font-size:12px;line-height:1.7;">${safeActionUrl}</p>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid rgba(255,255,255,0.08);padding:18px 32px;color:#64748b;font-size:12px;line-height:1.6;">
                This secure link was generated for North Star access. If you were not expecting this message, you can ignore it.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildNorthStarInviteEmail(input: NorthStarInviteEmailInput) {
  const name = input.recipientName.trim() || input.recipientEmail;

  return buildNorthStarAuthEmail({
    actionLabel: "Activate North Star access",
    actionUrl: input.actionUrl,
    body: `${name}, your North Star account is ready. Set your password, then use your email address as your username whenever you return to the application.`,
    eyebrow: "Invitation",
    preview: "Your North Star invitation is ready.",
    title: "Step into North Star"
  });
}

export function buildNorthStarRecoveryEmail(input: NorthStarRecoveryEmailInput) {
  return buildNorthStarAuthEmail({
    actionLabel: "Reset access",
    actionUrl: input.actionUrl,
    body: `Use this secure link to reset your North Star password. Your username is the email address receiving this message: ${input.recipientEmail}.`,
    eyebrow: "Account recovery",
    preview: "Reset your North Star password.",
    title: "Reset your North Star access"
  });
}

export function buildNorthStarInviteText(input: NorthStarInviteEmailInput) {
  const name = input.recipientName.trim() || input.recipientEmail;
  return `${name}, your North Star account is ready. Set your password and use your email address as your username: ${input.actionUrl}`;
}

export function buildNorthStarRecoveryText(input: NorthStarRecoveryEmailInput) {
  return `Reset your North Star password. Your username is this email address: ${input.recipientEmail}. Secure reset link: ${input.actionUrl}`;
}

export async function sendNorthStarEmail(input: SendNorthStarEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NORTHSTAR_EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("North Star branded email delivery is not configured.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      reply_to: process.env.NORTHSTAR_EMAIL_REPLY_TO || undefined
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "North Star branded email could not be sent.");
  }
}
