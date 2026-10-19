import assert from "node:assert/strict";
import test from "node:test";
import { createCipheriv, randomBytes } from "node:crypto";
import { registerHooks } from "node:module";

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
    return nextResolve(specifier, context);
  }
});
const { assertDiscoveryCheckpointConfigured, sealDiscoveryCheckpoint, openDiscoveryCheckpoint, discoveryRequestFingerprint, DiscoveryCheckpointError, DiscoveryCheckpointConfigurationError, DISCOVERY_CHECKPOINT_TTL_MS, DISCOVERY_CHECKPOINT_MAX_TOKEN_BYTES } = await import("../src/lib/discovery-studio-checkpoint.ts");
hooks.deregister();

// Synthetic isolated key only; no environment files or production values are read.
const secret = "18".repeat(32);
const now = 1_800_000_000_000;
const scope = "production:checkpoint-test-deployment";
const options = { secret, now, scope };
const binding = { owner: "user-1:browser-session-1", requestFingerprint: discoveryRequestFingerprint({ sources: [{ id: "S1", text: "Private discovery evidence" }], feedback: "Private review feedback" }) };
const payload = { evidence: { summary: "Private discovery findings", sources: [{ sourceId: "S1", text: "Resident financial details" }] }, research: { status: "completed" }, usage: { totalTokens: 1234 }, reviewIssues: [] };

function invalid(run: () => unknown) {
  assert.throws(run, (error: Error) => {
    assert.ok(error instanceof DiscoveryCheckpointError);
    assert.match(error.message, /invalid or expired/);
    assert.doesNotMatch(error.message, /Private|Resident|user-1|session-1|authenticate|decrypt|GCM|Unsupported|18{8}/);
    return true;
  });
}

function mutatePart(token: string, index: number) {
  const parts = token.split(".");
  const bytes = Buffer.from(parts[index], "base64url");
  bytes[Math.floor(bytes.length / 2)] ^= 1;
  parts[index] = bytes.toString("base64url");
  return parts.join(".");
}

function authenticatedEnvelope(envelope: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(secret, "hex"), iv, { authTagLength: 16 });
  cipher.setAAD(Buffer.from(JSON.stringify(["northstar:studio:discovery-review", 1, binding.owner, binding.requestFingerprint, scope])));
  const text = typeof envelope === "string" ? envelope : JSON.stringify(envelope);
  const ciphertext = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return `nsdcp.v1.${iv.toString("base64url")}.${ciphertext.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}`;
}

test("authenticated encryption round-trips complete JSON payloads with fresh IVs and no readable evidence", () => {
  const first = sealDiscoveryCheckpoint(payload, binding, options);
  const second = sealDiscoveryCheckpoint(payload, binding, options);
  assert.notEqual(first, second);
  assert.notEqual(first.split(".")[2], second.split(".")[2]);
  assert.deepEqual(openDiscoveryCheckpoint(first, binding, options), payload);
  assert.deepEqual(openDiscoveryCheckpoint(second, binding, options), payload);
  assert.doesNotMatch(first, /Private|Resident|sources|summary|totalTokens|user-1/);
  assert.doesNotMatch(Buffer.from(first.split(".")[3], "base64url").toString("utf8"), /Private discovery|Resident financial|totalTokens/);
  assert.ok(first.length < DISCOVERY_CHECKPOINT_MAX_TOKEN_BYTES);
  for (const value of [null, ["one", { two: 2 }], "plain JSON text", false, 0]) assert.deepEqual(openDiscoveryCheckpoint(sealDiscoveryCheckpoint(value, binding, options), binding, options), value);
});

test("wrong owner, browser session, normalized input, deployment scope or key fail authentication safely", () => {
  const token = sealDiscoveryCheckpoint(payload, binding, options);
  for (const owner of ["user-2:browser-session-1", "user-1:browser-session-2"]) invalid(() => openDiscoveryCheckpoint(token, { ...binding, owner }, options));
  invalid(() => openDiscoveryCheckpoint(token, { ...binding, requestFingerprint: discoveryRequestFingerprint({ sources: ["changed"] }) }, options));
  invalid(() => openDiscoveryCheckpoint(token, binding, { ...options, scope: "preview:different-deployment" }));
  invalid(() => openDiscoveryCheckpoint(token, binding, { ...options, secret: "92".repeat(32) }));
});

test("tampered IV, ciphertext and full authentication tag never return partial data", () => {
  const token = sealDiscoveryCheckpoint(payload, binding, options);
  for (const part of [2, 3, 4]) invalid(() => openDiscoveryCheckpoint(mutatePart(token, part), binding, options));
  const shortenedTag = token.split(".");
  shortenedTag[4] = Buffer.from(shortenedTag[4], "base64url").subarray(0, 8).toString("base64url");
  invalid(() => openDiscoveryCheckpoint(shortenedTag.join("."), binding, options));
});

test("expiry is exactly 30 minutes and future-issued checkpoints are rejected", () => {
  const token = sealDiscoveryCheckpoint(payload, binding, options);
  assert.deepEqual(openDiscoveryCheckpoint(token, binding, { ...options, now: now + DISCOVERY_CHECKPOINT_TTL_MS - 1 }), payload);
  invalid(() => openDiscoveryCheckpoint(token, binding, { ...options, now: now + DISCOVERY_CHECKPOINT_TTL_MS }));
  invalid(() => openDiscoveryCheckpoint(token, binding, { ...options, now: now - 1 }));
  invalid(() => openDiscoveryCheckpoint(token, binding, { ...options, now: NaN }));
});

test("authenticated but invalid purpose, version, timestamps, schema and JSON still fail closed", () => {
  const envelope = { purpose: "northstar:studio:discovery-review", version: 1, issuedAt: now, expiresAt: now + DISCOVERY_CHECKPOINT_TTL_MS, payload };
  for (const changed of [
    { ...envelope, purpose: "another-purpose" }, { ...envelope, version: 2 },
    { ...envelope, issuedAt: now + 1 }, { ...envelope, expiresAt: now + DISCOVERY_CHECKPOINT_TTL_MS + 1 },
    { ...envelope, expiresAt: now }, { ...envelope, issuedAt: "today" },
    { ...envelope, extra: "Private unauthorized envelope field" }, { payload }, [], null, "{invalid JSON"
  ]) invalid(() => openDiscoveryCheckpoint(authenticatedEnvelope(changed), binding, options));
});

test("malformed, unknown-version and noncanonical tokens fail before any caller can start paid work", () => {
  const token = sealDiscoveryCheckpoint(payload, binding, options);
  const parts = token.split(".");
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const noncanonicalTag = [...parts];
  noncanonicalTag[4] = `${parts[4].slice(0, -1)}${alphabet[alphabet.indexOf(parts[4].at(-1)!) + 1]}`;
  const malformed = ["", "Private malformed token", token.replace("nsdcp.v1", "nsdcp.v2"), `${token}.extra`, `${token}\n`, token.slice(0, -1), token.replace(parts[2], `${parts[2]}=`), noncanonicalTag.join("."), "X".repeat(DISCOVERY_CHECKPOINT_MAX_TOKEN_BYTES + 1)];
  let paidCalls = 0;
  for (const value of malformed) {
    invalid(() => { const result = openDiscoveryCheckpoint(value, binding, options); paidCalls++; return result; });
  }
  assert.equal(paidCalls, 0);
});

test("only a dedicated 32-byte hex, canonical base64 or base64url key is accepted", () => {
  for (const configured of [secret, Buffer.from(secret, "hex").toString("base64"), Buffer.from(secret, "hex").toString("base64url")]) {
    assertDiscoveryCheckpointConfigured({ secret: configured });
    const token = sealDiscoveryCheckpoint(payload, binding, { ...options, secret: configured });
    assert.deepEqual(openDiscoveryCheckpoint(token, binding, options), payload);
  }
  for (const configured of ["", "Private short password", "0".repeat(63), "G".repeat(64), Buffer.alloc(31).toString("base64"), `${Buffer.alloc(32).toString("base64")}!`]) {
    assert.throws(() => assertDiscoveryCheckpointConfigured({ secret: configured }), (error: Error) => {
      assert.ok(error instanceof DiscoveryCheckpointConfigurationError);
      assert.doesNotMatch(error.message, /Private|password|STUDIO_CHECKPOINT_SECRET|G{8}/);
      return true;
    });
  }
  let paidCalls = 0;
  assert.throws(() => { assertDiscoveryCheckpointConfigured({ secret: "" }); paidCalls++; }, DiscoveryCheckpointConfigurationError);
  assert.equal(paidCalls, 0);
});

test("oversized, circular and unserializable payloads produce bounded safe errors without logging", () => {
  const info = console.info;
  const error = console.error;
  const logs: unknown[] = [];
  console.info = (...items) => { logs.push(items); };
  console.error = (...items) => { logs.push(items); };
  try {
    assert.throws(() => sealDiscoveryCheckpoint({ text: "Private content".repeat(100_000) }, binding, options), (failure: Error) => {
      assert.ok(failure instanceof DiscoveryCheckpointError);
      assert.match(failure.message, /too large/);
      assert.ok(failure.message.length < 250);
      assert.doesNotMatch(failure.message, /Private content/);
      return true;
    });
    assert.throws(() => sealDiscoveryCheckpoint({ text: "🍁".repeat(200_000) }, binding, options), /too large/);
    const nearLimit = { text: "X".repeat(700_000) };
    const token = sealDiscoveryCheckpoint(nearLimit, binding, options);
    assert.ok(token.length < DISCOVERY_CHECKPOINT_MAX_TOKEN_BYTES);
    assert.deepEqual(openDiscoveryCheckpoint(token, binding, options), nearLimit);
    const circular: Record<string, unknown> = {}; circular.self = circular;
    invalid(() => sealDiscoveryCheckpoint(circular, binding, options));
    invalid(() => sealDiscoveryCheckpoint(undefined, binding, options));
    invalid(() => sealDiscoveryCheckpoint({ value: BigInt(1) }, binding, options));
    assert.deepEqual(logs, []);
  } finally { console.info = info; console.error = error; }
});

test("canonical fingerprints ignore object insertion order but preserve arrays, text and prototype-named keys", () => {
  const first = { z: [{ y: "Private", x: 1 }, 2], a: true };
  const reordered = { a: true, z: [{ x: 1, y: "Private" }, 2] };
  assert.equal(discoveryRequestFingerprint(first), discoveryRequestFingerprint(reordered));
  assert.notEqual(discoveryRequestFingerprint(first), discoveryRequestFingerprint({ a: true, z: [2, { x: 1, y: "Private" }] }));
  assert.notEqual(discoveryRequestFingerprint(first), discoveryRequestFingerprint({ a: true, z: [{ x: 1, y: "Changed" }, 2] }));
  assert.notEqual(discoveryRequestFingerprint(JSON.parse('{"__proto__":{"private":true}}')), discoveryRequestFingerprint({}));
  assert.equal(discoveryRequestFingerprint({ optional: undefined, a: 1 }), discoveryRequestFingerprint({ a: 1 }));
  assert.match(discoveryRequestFingerprint(first), /^[a-f0-9]{64}$/);
});

test("expired or mismatched handoffs cannot be extended, while replay requires explicit caller policy", () => {
  const token = sealDiscoveryCheckpoint(payload, binding, options);
  assert.deepEqual(openDiscoveryCheckpoint(token, binding, options), payload);
  assert.deepEqual(openDiscoveryCheckpoint(token, binding, options), payload, "Stateless encryption is not a one-use or durable job guarantee.");
  invalid(() => openDiscoveryCheckpoint(token, { ...binding, requestFingerprint: "bad-fingerprint" }, options));
});
