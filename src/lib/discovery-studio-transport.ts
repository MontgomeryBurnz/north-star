import type { DiscoverySynthesis } from "./discovery-studio-types";

type StudioOutcome = { status: number; body: { synthesis: DiscoverySynthesis } | { error: string } };
const heartbeat = 'event: heartbeat\ndata: {"status":"working"}\n\n';
const transportError = "The Studio connection was interrupted before a complete result arrived. Please review the connection before trying again.";
const unexpectedError = "Studio could not finish the analysis. Your current package is preserved.";
const maxEventCharacters = 4_000_000;
class StudioResponseError extends Error {}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function text(value: unknown): value is string { return typeof value === "string" && Boolean(value.trim()); }
function texts(value: unknown): value is string[] { return Array.isArray(value) && value.every(text); }
function fields(value: Record<string, unknown>, names: string[]) { return names.every((name) => text(value[name])); }
function items(value: unknown, valid: (item: Record<string, unknown>) => boolean, minimum = 0) {
  return Array.isArray(value) && value.length >= minimum && value.every((item) => { const entry = record(item); return Boolean(entry && valid(entry)); });
}
function finite(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value); }
function choice(value: unknown, allowed: string[]) { return typeof value === "string" && allowed.includes(value); }

// Transport shape checks only. The server's existing evidence, fidelity and quality
// gates remain authoritative; never accept a partial hierarchy as a final result.
function isSynthesis(value: unknown): value is DiscoverySynthesis {
  const s = record(value);
  if (!s || !fields(s, ["executiveSummary", "evidenceSummary", "readinessNarrative", "generatedAt"])
    || !texts(s.capabilities) || !s.capabilities.length || !texts(s.painPoints) || !s.painPoints.length
    || !texts(s.businessRules) || !texts(s.assumptions) || !finite(s.readinessScore) || s.readinessScore < 0 || s.readinessScore > 100
    || !finite(s.sourceCount) || !Number.isInteger(s.sourceCount) || s.sourceCount < 0 || !choice(s.provider, ["local", "openai"])) return false;
  if (!items(s.gaps, (v) => fields(v, ["id", "title", "description", "question"]) && texts(v.sourceIds) && choice(v.severity, ["blocking", "important", "optional"]))
    || !items(s.roadmap, (v) => fields(v, ["horizon", "title", "outcome"]) && texts(v.featureIds) && texts(v.dependencies), 1)
    || !items(s.epics, (v) => fields(v, ["id", "title", "objective"]) && texts(v.featureIds) && texts(v.sourceIds), 1)
    || !items(s.features, (v) => fields(v, ["id", "epicId", "title", "description", "outcome"]) && texts(v.sourceIds) && choice(v.priority, ["must", "should", "could"]), 1)
    || !items(s.stories, (v) => fields(v, ["id", "epicId", "featureId", "title", "story"]) && texts(v.acceptanceCriteria) && v.acceptanceCriteria.length > 0 && texts(v.sourceIds)
      && choice(v.readiness, ["ready", "needs-input"])
      && items(v.testCases, (t) => fields(t, ["id", "title", "expectedResult"]) && texts(t.steps) && t.steps.length > 0 && choice(t.type, ["happy-path", "negative", "edge"]), 1), 1)) return false;
  if (s.quality !== undefined) {
    const q = record(s.quality);
    if (!q || !choice(q.status, ["reviewed", "provisional"]) || !texts(q.checks) || !texts(q.warnings)) return false;
  }
  if (s.research !== undefined) {
    const r = record(s.research);
    if (!r || !choice(r.status, ["not-requested", "completed", "unavailable"]) || !text(r.summary) || !items(r.sources, (v) => fields(v, ["title", "url"]))) return false;
  }
  if (s.revision !== undefined) {
    const r = record(s.revision);
    if (!r || !finite(r.number) || !text(r.summary) || (r.feedback !== undefined && typeof r.feedback !== "string")) return false;
  }
  if (s.sources !== undefined && !items(s.sources, (v) => fields(v, ["id", "name"]) && choice(v.coverage, ["complete", "excerpt"]) && finite(v.characters) && v.characters >= 0)) return false;
  return true;
}

export async function discoveryStudioResponse(request: Request, work: () => Promise<StudioOutcome>): Promise<Response> {
  const acceptsStream = request.headers.get("accept")?.split(",").some((type) => {
    const [media, ...parameters] = type.trim().toLowerCase().split(";");
    return media.trim() === "text/event-stream" && !parameters.some((parameter) => /^\s*q=0(?:\.0*)?\s*$/.test(parameter));
  });
  // Legacy callers retain ordinary JSON statuses, including generation503/audit500.
  if (!acceptsStream) {
    const result = await work();
    return Response.json(result.body, { status: result.status });
  }
  const encoder = new TextEncoder();
  let closed = false;
  let timer: ReturnType<typeof setInterval> | undefined;
  const cleanup = () => { if (timer !== undefined) { clearInterval(timer); timer = undefined; } };
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(event)); }
        catch { closed = true; cleanup(); }
      };
      // Flush a safe first byte before starting any model or audit work.
      send(heartbeat);
      if (!closed) timer = setInterval(() => send(heartbeat), 15_000);
      void Promise.resolve().then(work).then((result) => {
        if (closed) return;
        const event = "synthesis" in result.body ? "result" : "error";
        send(`event: ${event}\ndata: ${JSON.stringify(result.body)}\n\n`);
      }).catch(() => {
        send(`event: error\ndata: ${JSON.stringify({ error: unexpectedError })}\n\n`);
      }).finally(() => {
        cleanup();
        if (!closed) { closed = true; controller.close(); }
      });
    },
    cancel() { closed = true; cleanup(); }
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store, no-transform", "x-accel-buffering": "no" } });
}

export async function readDiscoveryStudioResponse(response: Response, onHeartbeat?: () => void): Promise<DiscoverySynthesis> {
  const isStream = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() === "text/event-stream";
  if (!isStream) {
    let payload: Record<string, unknown> | null;
    try { payload = record(await response.json()); } catch { throw new StudioResponseError(transportError); }
    if (!response.ok || text(payload?.error)) throw new StudioResponseError(text(payload?.error) ? payload.error : unexpectedError);
    if (!isSynthesis(payload?.synthesis)) throw new StudioResponseError(transportError);
    return payload.synthesis;
  }
  if (!response.ok || !response.body) throw new StudioResponseError(transportError);
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let buffer = "";
  let data: string[] = [];
  let event = "";
  let result: DiscoverySynthesis | undefined;
  function dispatch() {
    if (!data.length && !event) return;
    let payload: Record<string, unknown> | null;
    try { payload = record(JSON.parse(data.join("\n"))); } catch { throw new StudioResponseError(transportError); }
    data = [];
    const kind = event;
    event = "";
    if (result) throw new StudioResponseError(transportError);
    if (kind === "heartbeat" && payload?.status === "working") { onHeartbeat?.(); return; }
    if (kind === "error" && text(payload?.error)) throw new StudioResponseError(payload.error);
    if (kind !== "result" || !isSynthesis(payload?.synthesis) || payload?.error !== undefined) throw new StudioResponseError(transportError);
    result = payload.synthesis;
  }
  try {
    while (true) {
      const chunk = await reader.read();
      buffer += decoder.decode(chunk.value, { stream: !chunk.done });
      if (buffer.length + data.reduce((sum, line) => sum + line.length, 0) + event.length > maxEventCharacters) throw new StudioResponseError(transportError);
      while (true) {
        const end = buffer.search(/[\r\n]/);
        if (end < 0 || (buffer[end] === "\r" && end === buffer.length - 1 && !chunk.done)) break;
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + (buffer[end] === "\r" && buffer[end + 1] === "\n" ? 2 : 1));
        if (!line) dispatch();
        else if (!line.startsWith(":")) {
          const colon = line.indexOf(":");
          const field = colon < 0 ? line : line.slice(0, colon);
          const value = colon < 0 ? "" : line.slice(colon + 1).replace(/^ /, "");
          if (field === "event") event = value;
          if (field === "data") data.push(value);
        }
      }
      if (chunk.done) {
        if (!result || buffer.length || data.length || event) throw new StudioResponseError(transportError);
        return result;
      }
    }
  } catch (error) {
    // Application errors are already safe caller-facing messages. Network/decoder
    // failures must never result in a partial revision or expose transport internals.
    if (error instanceof StudioResponseError) throw error;
    throw new StudioResponseError(transportError);
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
