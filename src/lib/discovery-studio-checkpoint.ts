import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const purpose = "northstar:studio:discovery-review";
const tokenPrefix = "nsdcp.v1";
const version = 1;
const maxPlaintextBytes = 750_000;
const maxFingerprintBytes = 4_000_000;
export const DISCOVERY_CHECKPOINT_MAX_TOKEN_BYTES = 1_048_576;
export const DISCOVERY_CHECKPOINT_TTL_MS = 30 * 60 * 1000;

export type DiscoveryCheckpointBinding = { owner: string; requestFingerprint: string };
export type DiscoveryCheckpointOptions = {
  /** Server-only injection for isolated tests; never accept these options from a request. */
  secret?: string;
  now?: number;
  scope?: string;
};

export class DiscoveryCheckpointConfigurationError extends Error {
  readonly code = "checkpoint-configuration";
  constructor() {
    super("Secure Studio handoff is unavailable. Please contact an administrator; your current package is preserved.");
    this.name = "DiscoveryCheckpointConfigurationError";
  }
}

export class DiscoveryCheckpointError extends Error {
  readonly code: "checkpoint-invalid" | "checkpoint-too-large";
  constructor(kind: "invalid" | "too-large" = "invalid") {
    super(kind === "too-large"
      ? "This discovery review is too large for a secure handoff. Use a smaller discovery package; your current package is preserved."
      : "This Studio handoff is invalid or expired. Analyze the discovery package again; your current package is preserved.");
    this.name = "DiscoveryCheckpointError";
    this.code = kind === "too-large" ? "checkpoint-too-large" : "checkpoint-invalid";
  }
}

function key(options: DiscoveryCheckpointOptions) {
  const secret = (options.secret ?? process.env.STUDIO_CHECKPOINT_SECRET ?? "").trim();
  if (/^[a-f0-9]{64}$/i.test(secret)) return Buffer.from(secret, "hex");
  for (const encoding of ["base64", "base64url"] as const) {
    if (!(encoding === "base64" ? /^[A-Za-z0-9+/]{43}=$/ : /^[A-Za-z0-9_-]{43}$/).test(secret)) continue;
    const decoded = Buffer.from(secret, encoding);
    if (decoded.length === 32 && decoded.toString(encoding) === secret) return decoded;
  }
  throw new DiscoveryCheckpointConfigurationError();
}

/** Run before evidence generation so missing configuration cannot incur model calls. */
export function assertDiscoveryCheckpointConfigured(options: DiscoveryCheckpointOptions = {}) {
  key(options);
}

function clock(options: DiscoveryCheckpointOptions) {
  const now = options.now ?? Date.now();
  if (!Number.isSafeInteger(now) || now < 0 || now > Number.MAX_SAFE_INTEGER - DISCOVERY_CHECKPOINT_TTL_MS) throw new DiscoveryCheckpointError();
  return now;
}

function additionalData(binding: DiscoveryCheckpointBinding, options: DiscoveryCheckpointOptions) {
  const scope = options.scope ?? JSON.stringify([
    process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    process.env.VERCEL_URL ?? "local"
  ]);
  if (!binding || typeof binding.owner !== "string" || !binding.owner.trim() || binding.owner.length > 512
    || typeof binding.requestFingerprint !== "string" || !/^[a-f0-9]{64}$/.test(binding.requestFingerprint)
    || typeof scope !== "string" || !scope.trim() || scope.length > 1024) throw new DiscoveryCheckpointError();
  return Buffer.from(JSON.stringify([purpose, version, binding.owner, binding.requestFingerprint, scope]), "utf8");
}

function jsonWireValue(value: unknown, limit: number) {
  try {
    const encoded = JSON.stringify(value);
    if (typeof encoded !== "string") throw new DiscoveryCheckpointError();
    if (Buffer.byteLength(encoded, "utf8") > limit) throw new DiscoveryCheckpointError("too-large");
    return { encoded, value: JSON.parse(encoded) as unknown };
  } catch (error) {
    if (error instanceof DiscoveryCheckpointError) throw error;
    throw new DiscoveryCheckpointError();
  }
}

function canonicalJson(value: unknown, depth = 0): string {
  if (depth > 100) throw new DiscoveryCheckpointError();
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item, depth + 1)).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((name) => `${JSON.stringify(name)}:${canonicalJson(object[name], depth + 1)}`).join(",")}}`;
}

/** Hash the already-normalized request, sorting object keys but preserving arrays. */
export function discoveryRequestFingerprint(value: unknown) {
  const json = jsonWireValue(value, maxFingerprintBytes);
  return createHash("sha256").update("northstar:studio:request:v1\0").update(canonicalJson(json.value), "utf8").digest("hex");
}

/** An encrypted browser-memory handoff, not durable storage or a one-use/replay guarantee. */
export function sealDiscoveryCheckpoint(payload: unknown, binding: DiscoveryCheckpointBinding, options: DiscoveryCheckpointOptions = {}) {
  const secret = key(options);
  const aad = additionalData(binding, options);
  const issuedAt = clock(options);
  const envelope = jsonWireValue({ purpose, version, issuedAt, expiresAt: issuedAt + DISCOVERY_CHECKPOINT_TTL_MS, payload }, maxPlaintextBytes);
  if (!("payload" in (envelope.value as Record<string, unknown>))) throw new DiscoveryCheckpointError();
  try {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", secret, iv, { authTagLength: 16 });
    cipher.setAAD(aad);
    const ciphertext = Buffer.concat([cipher.update(envelope.encoded, "utf8"), cipher.final()]);
    const token = `${tokenPrefix}.${iv.toString("base64url")}.${ciphertext.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}`;
    if (token.length > DISCOVERY_CHECKPOINT_MAX_TOKEN_BYTES) throw new DiscoveryCheckpointError("too-large");
    return token;
  } catch (error) {
    if (error instanceof DiscoveryCheckpointError) throw error;
    throw new DiscoveryCheckpointError();
  }
}

function decode(value: string, expectedBytes?: number) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new DiscoveryCheckpointError();
  const result = Buffer.from(value, "base64url");
  if (result.toString("base64url") !== value || expectedBytes !== undefined && result.length !== expectedBytes) throw new DiscoveryCheckpointError();
  return result;
}

export function openDiscoveryCheckpoint(token: string, binding: DiscoveryCheckpointBinding, options: DiscoveryCheckpointOptions = {}): unknown {
  const secret = key(options);
  const aad = additionalData(binding, options);
  const now = clock(options);
  try {
    if (typeof token !== "string" || token.length > DISCOVERY_CHECKPOINT_MAX_TOKEN_BYTES) throw new DiscoveryCheckpointError();
    const parts = token.split(".");
    if (parts.length !== 5 || `${parts[0]}.${parts[1]}` !== tokenPrefix) throw new DiscoveryCheckpointError();
    const iv = decode(parts[2], 12);
    const ciphertext = decode(parts[3]);
    const tag = decode(parts[4], 16);
    if (ciphertext.length > maxPlaintextBytes) throw new DiscoveryCheckpointError();
    const decipher = createDecipheriv("aes-256-gcm", secret, iv, { authTagLength: 16 });
    decipher.setAAD(aad);
    decipher.setAuthTag(tag);
    // Never parse or return the unauthenticated update() output before final()
    // has verified the native GCM authentication tag.
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const envelope = JSON.parse(plaintext.toString("utf8")) as Record<string, unknown> | null;
    if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)
      || Object.keys(envelope).sort().join(",") !== "expiresAt,issuedAt,payload,purpose,version"
      || envelope.purpose !== purpose || envelope.version !== version
      || !Number.isSafeInteger(envelope.issuedAt) || !Number.isSafeInteger(envelope.expiresAt)
      || (envelope.issuedAt as number) < 0 || (envelope.issuedAt as number) > now
      || (envelope.expiresAt as number) - (envelope.issuedAt as number) !== DISCOVERY_CHECKPOINT_TTL_MS
      || now >= (envelope.expiresAt as number)) throw new DiscoveryCheckpointError();
    return envelope.payload;
  } catch {
    // Wrong owner/input/scope/key, bad tags and malformed plaintext share one
    // safe error; never include tokens, raw sources or native crypto messages.
    throw new DiscoveryCheckpointError();
  }
}
