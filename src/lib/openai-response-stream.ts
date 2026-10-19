type ResponseRecord = Record<string, unknown>;

export class OpenAIResponseStreamError extends Error {
  readonly category: "malformed-response" | "truncated-stream" | "failed-response" | "incomplete-response";
  readonly responseId?: unknown;
  readonly upstreamCode?: unknown;
  constructor(
    category: OpenAIResponseStreamError["category"],
    responseId?: unknown,
    upstreamCode?: unknown
  ) {
    super(category);
    this.name = "OpenAIResponseStreamError";
    this.category = category;
    this.responseId = responseId;
    this.upstreamCode = upstreamCode;
  }
}

function record(value: unknown): ResponseRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as ResponseRecord : null;
}

// Consume only a completed terminal response. Deltas are never a usable product package.
export async function readOpenAIResponsePayload(response: Response): Promise<ResponseRecord> {
  if (!response.headers.get("content-type")?.toLowerCase().includes("text/event-stream")) {
    const payload = record(await response.json());
    if (!payload) throw new OpenAIResponseStreamError("malformed-response");
    return payload;
  }
  if (!response.body) throw new OpenAIResponseStreamError("truncated-stream");

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let buffer = "";
  let data: string[] = [];
  let eventName = "";
  let responseId: unknown;

  function dispatch(): ResponseRecord | null {
    const eventData = data.join("\n");
    const namedEvent = eventName;
    data = [];
    eventName = "";
    if (!eventData) return null;
    if (eventData === "[DONE]") throw new OpenAIResponseStreamError("truncated-stream", responseId);
    let event: ResponseRecord | null;
    try { event = record(JSON.parse(eventData)); } catch { throw new OpenAIResponseStreamError("malformed-response", responseId); }
    if (!event || typeof event.type !== "string" || (namedEvent && namedEvent !== event.type)) {
      throw new OpenAIResponseStreamError("malformed-response", responseId);
    }
    const payload = record(event.response);
    if (payload?.id !== undefined) responseId = payload.id;
    if (event.type === "response.failed" || event.type === "error") {
      throw new OpenAIResponseStreamError("failed-response", responseId, record(payload?.error)?.code ?? event.code);
    }
    if (event.type === "response.incomplete") {
      throw new OpenAIResponseStreamError("incomplete-response", responseId, record(payload?.incomplete_details)?.reason);
    }
    if (event.type !== "response.completed") return null;
    if (!payload || payload.status !== "completed") throw new OpenAIResponseStreamError("malformed-response", responseId);
    return payload;
  }

  function line(value: string): ResponseRecord | null {
    if (!value) return dispatch();
    if (value.startsWith(":")) return null;
    const separator = value.indexOf(":");
    const field = separator < 0 ? value : value.slice(0, separator);
    let content = separator < 0 ? "" : value.slice(separator + 1);
    if (content.startsWith(" ")) content = content.slice(1);
    if (field === "data") data.push(content);
    if (field === "event") eventName = content;
    return null;
  }

  try {
    while (true) {
      const chunk = await reader.read();
      try { buffer += decoder.decode(chunk.value, { stream: !chunk.done }); }
      catch { throw new OpenAIResponseStreamError("malformed-response", responseId); }
      // A single terminal response is bounded well above Studio's output-token budget.
      if (buffer.length + data.reduce((sum, value) => sum + value.length, 0) > 4_000_000) {
        throw new OpenAIResponseStreamError("malformed-response", responseId);
      }
      while (true) {
        const end = buffer.search(/[\r\n]/);
        if (end < 0 || (buffer[end] === "\r" && end === buffer.length - 1 && !chunk.done)) break;
        const value = buffer.slice(0, end);
        const newlineLength = buffer[end] === "\r" && buffer[end + 1] === "\n" ? 2 : 1;
        buffer = buffer.slice(end + newlineLength);
        const payload = line(value);
        if (payload) {
          return payload;
        }
      }
      if (chunk.done) throw new OpenAIResponseStreamError("truncated-stream", responseId);
    }
  } finally {
    // Stop upstream work after a terminal event or invalid stream; never let cleanup hide its outcome.
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
