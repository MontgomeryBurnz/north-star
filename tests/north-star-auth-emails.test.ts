import assert from "node:assert/strict";
import test from "node:test";
import {
  buildNorthStarInviteEmail,
  buildNorthStarInviteText,
  buildNorthStarRecoveryEmail,
  formatNorthStarEmailSendError,
  getNorthStarEmailDeliveryStatus
} from "../src/lib/north-star-auth-emails.ts";

test("buildNorthStarInviteEmail renders branded setup copy and escapes user content", () => {
  const html = buildNorthStarInviteEmail({
    actionUrl: "https://northstar.test/auth/callback?token=abc",
    recipientEmail: "lead@example.com",
    recipientName: "<Lead>"
  });

  assert.match(html, /North Star/);
  assert.match(html, /Activate North Star access/);
  assert.match(html, /Step into North Star/);
  assert.match(html, /&lt;Lead&gt;/);
  assert.doesNotMatch(html, /<Lead>/);
});

test("buildNorthStarInviteText identifies email as username", () => {
  const text = buildNorthStarInviteText({
    actionUrl: "https://northstar.test/setup",
    recipientEmail: "lead@example.com",
    recipientName: "Lead"
  });

  assert.match(text, /email address as your username/);
  assert.match(text, /https:\/\/northstar\.test\/setup/);
});

test("buildNorthStarRecoveryEmail includes username recovery guidance", () => {
  const html = buildNorthStarRecoveryEmail({
    actionUrl: "https://northstar.test/recover",
    recipientEmail: "lead@example.com"
  });

  assert.match(html, /Reset your North Star access/);
  assert.match(html, /Your username is the email address/);
});

test("formatNorthStarEmailSendError explains Resend testing mode", () => {
  const message = formatNorthStarEmailSendError(
    JSON.stringify({
      statusCode: 403,
      name: "validation_error",
      message: "You can only send testing emails to your own email address. To send emails to other recipients, please verify a domain at resend.com/domains."
    })
  );

  assert.match(message, /Resend is still in testing mode/);
  assert.match(message, /NORTHSTAR_EMAIL_FROM/);
});

test("getNorthStarEmailDeliveryStatus requires explicit branded email enablement", () => {
  const previousApiKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.NORTHSTAR_EMAIL_FROM;
  const previousEnabled = process.env.NORTHSTAR_BRANDED_EMAILS_ENABLED;

  process.env.RESEND_API_KEY = "test-key";
  process.env.NORTHSTAR_EMAIL_FROM = "North Star <invite@example.com>";
  delete process.env.NORTHSTAR_BRANDED_EMAILS_ENABLED;

  assert.deepEqual(getNorthStarEmailDeliveryStatus(), {
    configured: false,
    credentialsConfigured: true,
    enabled: false,
    provider: "resend",
    senderDomain: "example.com",
    senderMode: "custom-domain"
  });

  process.env.NORTHSTAR_BRANDED_EMAILS_ENABLED = "true";
  assert.equal(getNorthStarEmailDeliveryStatus().configured, true);

  if (previousApiKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = previousApiKey;
  if (previousFrom === undefined) delete process.env.NORTHSTAR_EMAIL_FROM;
  else process.env.NORTHSTAR_EMAIL_FROM = previousFrom;
  if (previousEnabled === undefined) delete process.env.NORTHSTAR_BRANDED_EMAILS_ENABLED;
  else process.env.NORTHSTAR_BRANDED_EMAILS_ENABLED = previousEnabled;
});
