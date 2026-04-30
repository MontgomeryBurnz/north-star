import net from "node:net";
import tls from "node:tls";

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

export type NorthStarEmailDeliveryStatus = {
  configured: boolean;
  credentialsConfigured: boolean;
  enabled: boolean;
  provider: "resend" | "smtp";
  senderDomain?: string;
  senderMode: "custom-domain" | "mailbox" | "missing" | "resend-test";
};

type SmtpConfig = {
  host: string;
  password: string;
  port: number;
  secure: boolean;
  user: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getSenderDomain(fromAddress: string | undefined) {
  const match = fromAddress?.match(/@([^>\s]+)>?$/);
  return match?.[1]?.trim().toLowerCase();
}

function getSenderEmail(fromAddress: string | undefined) {
  const match = fromAddress?.match(/<([^>\s]+@[^>\s]+)>$/);
  return match?.[1]?.trim() ?? fromAddress?.trim();
}

function sanitizeHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function isSmtpAddress(value: string | undefined): value is string {
  return Boolean(value && /^[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+$/.test(value));
}

function getSenderMode(senderDomain: string | undefined): NorthStarEmailDeliveryStatus["senderMode"] {
  if (!senderDomain) return "missing";
  return senderDomain.endsWith("resend.dev") ? "resend-test" : "custom-domain";
}

function getEmailDeliveryProvider(): NorthStarEmailDeliveryStatus["provider"] {
  if (process.env.NORTHSTAR_EMAIL_DELIVERY_PROVIDER === "smtp") return "smtp";
  if (process.env.NORTHSTAR_EMAIL_DELIVERY_PROVIDER === "resend") return "resend";
  return process.env.NORTHSTAR_SMTP_HOST ? "smtp" : "resend";
}

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.NORTHSTAR_SMTP_HOST?.trim();
  const password = process.env.NORTHSTAR_SMTP_PASS;
  const port = Number.parseInt(process.env.NORTHSTAR_SMTP_PORT || "", 10);
  const user = process.env.NORTHSTAR_SMTP_USER?.trim();

  if (!host || !password || !Number.isFinite(port) || !user) return null;

  return {
    host,
    password,
    port,
    secure: process.env.NORTHSTAR_SMTP_SECURE === "true" || port === 465,
    user
  };
}

export function getNorthStarEmailDeliveryStatus(): NorthStarEmailDeliveryStatus {
  const provider = getEmailDeliveryProvider();
  const senderDomain = getSenderDomain(process.env.NORTHSTAR_EMAIL_FROM);
  const enabled = process.env.NORTHSTAR_BRANDED_EMAILS_ENABLED === "true";

  if (provider === "smtp") {
    const credentialsConfigured = Boolean(getSmtpConfig() && process.env.NORTHSTAR_EMAIL_FROM);

    return {
      configured: enabled && credentialsConfigured,
      credentialsConfigured,
      enabled,
      provider,
      senderDomain,
      senderMode: credentialsConfigured ? "mailbox" : "missing"
    };
  }

  const credentialsConfigured = Boolean(process.env.RESEND_API_KEY && process.env.NORTHSTAR_EMAIL_FROM);
  const senderMode = getSenderMode(senderDomain);

  return {
    configured: enabled && credentialsConfigured && senderMode === "custom-domain",
    credentialsConfigured,
    enabled,
    provider: "resend",
    senderDomain,
    senderMode
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
  const delivery = getNorthStarEmailDeliveryStatus();

  if (!delivery.configured) {
    throw new Error("North Star email delivery is not enabled.");
  }

  if (delivery.provider === "smtp") {
    await sendNorthStarSmtpEmail(input);
    return;
  }

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
    throw new Error(formatNorthStarEmailSendError(errorText));
  }
}

async function sendNorthStarSmtpEmail(input: SendNorthStarEmailInput) {
  const config = getSmtpConfig();
  const from = process.env.NORTHSTAR_EMAIL_FROM;
  const envelopeFrom = getSenderEmail(from);
  const envelopeTo = getSenderEmail(input.to);

  if (!config || !from || !isSmtpAddress(envelopeFrom) || !isSmtpAddress(envelopeTo)) {
    throw new Error("North Star SMTP email delivery is not configured.");
  }

  const client = await createSmtpConnection(config);

  try {
    await client.expect([220]);
    await client.command(`EHLO ${process.env.NORTHSTAR_SMTP_HELO || "northstar-alpha.local"}`, [250]);

    if (!config.secure) {
      await client.command("STARTTLS", [220]);
      await client.upgrade(config.host);
      await client.command(`EHLO ${process.env.NORTHSTAR_SMTP_HELO || "northstar-alpha.local"}`, [250]);
    }

    await client.command("AUTH LOGIN", [334]);
    await client.command(Buffer.from(config.user).toString("base64"), [334]);
    await client.command(Buffer.from(config.password).toString("base64"), [235]);
    await client.command(`MAIL FROM:<${envelopeFrom}>`, [250]);
    await client.command(`RCPT TO:<${envelopeTo}>`, [250, 251]);
    await client.command("DATA", [354]);
    await client.writeData(buildSmtpMessage({ from, input }));
    await client.command("QUIT", [221]);
  } finally {
    client.close();
  }
}

function buildSmtpMessage({ from, input }: { from: string; input: SendNorthStarEmailInput }) {
  const boundary = `northstar-${Date.now().toString(36)}`;
  const replyTo = process.env.NORTHSTAR_EMAIL_REPLY_TO;
  const headers = [
    `From: ${sanitizeHeader(from)}`,
    `To: ${sanitizeHeader(input.to)}`,
    replyTo ? `Reply-To: ${sanitizeHeader(replyTo)}` : "",
    `Subject: ${sanitizeHeader(input.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`
  ].filter(Boolean);

  const message = [
    ...headers,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    input.text,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    input.html,
    "",
    `--${boundary}--`,
    ""
  ].join("\r\n");

  return message.replace(/^\./gm, "..");
}

function createSmtpConnection(config: SmtpConfig) {
  return new Promise<SmtpSession>((resolve, reject) => {
    const socket = config.secure
      ? tls.connect(config.port, config.host, { servername: config.host })
      : net.connect(config.port, config.host);

    const session = new SmtpSession(socket);
    if (config.secure) {
      socket.once("secureConnect", () => resolve(session));
    } else {
      socket.once("connect", () => resolve(session));
    }
    socket.once("error", reject);
  });
}

class SmtpSession {
  private buffer = "";
  private pending:
    | {
        expected: number[];
        reject: (error: Error) => void;
        resolve: (line: string) => void;
      }
    | null = null;
  private socket: net.Socket | tls.TLSSocket;
  private timeout: NodeJS.Timeout | null = null;

  constructor(socket: net.Socket | tls.TLSSocket) {
    this.socket = socket;
    this.socket.on("data", (chunk) => this.handleData(chunk.toString("utf8")));
    this.socket.on("error", (error) => {
      if (this.pending) {
        this.pending.reject(error);
        this.pending = null;
      }
    });
  }

  close() {
    if (this.timeout) clearTimeout(this.timeout);
    this.socket.destroy();
  }

  command(command: string, expected: number[]) {
    this.socket.write(`${command}\r\n`);
    return this.expect(expected);
  }

  expect(expected: number[]) {
    return new Promise<string>((resolve, reject) => {
      this.pending = { expected, reject, resolve };
      this.timeout = setTimeout(() => {
        this.pending = null;
        reject(new Error("SMTP server timed out."));
      }, 15000);
      this.flush();
    });
  }

  upgrade(host: string) {
    this.socket.removeAllListeners("data");
    return new Promise<void>((resolve, reject) => {
      const secureSocket = tls.connect({ servername: host, socket: this.socket }, () => resolve());
      this.socket = secureSocket;
      this.socket.on("data", (chunk) => this.handleData(chunk.toString("utf8")));
      this.socket.once("error", reject);
    });
  }

  async writeData(message: string) {
    this.socket.write(`${message}\r\n.\r\n`);
    await this.expect([250]);
  }

  private flush() {
    if (!this.pending) return;

    const lines = this.buffer.split(/\r?\n/);
    if (!this.buffer.endsWith("\n")) {
      this.buffer = lines.pop() ?? "";
    } else {
      this.buffer = "";
    }

    for (const line of lines) {
      if (!line) continue;
      const code = Number.parseInt(line.slice(0, 3), 10);
      const complete = line[3] === " ";
      if (!complete || !Number.isFinite(code)) continue;

      const pending = this.pending;
      this.pending = null;
      if (this.timeout) clearTimeout(this.timeout);

      if (pending.expected.includes(code)) {
        pending.resolve(line);
      } else {
        pending.reject(new Error(`SMTP server rejected the message: ${line}`));
      }
      break;
    }
  }

  private handleData(data: string) {
    this.buffer += data;
    this.flush();
  }
}

export function formatNorthStarEmailSendError(errorText: string) {
  const fallback = "North Star branded email could not be sent.";
  let message = errorText.trim();

  try {
    const parsed = JSON.parse(errorText) as { message?: unknown };
    if (typeof parsed.message === "string") {
      message = parsed.message;
    }
  } catch {
    // Resend usually returns JSON, but preserve plain-text provider errors when it does not.
  }

  if (/only send testing emails/i.test(message) || /verify a domain/i.test(message)) {
    return "Resend is still in testing mode for external recipients. Verify a sending domain in Resend, update NORTHSTAR_EMAIL_FROM to an address on that domain, redeploy, and then resend the invite.";
  }

  return message || fallback;
}
