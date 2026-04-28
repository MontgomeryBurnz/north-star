export type ResponsesApiPayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

export function extractOutputText(payload: ResponsesApiPayload) {
  if (payload.output_text?.trim()) return payload.output_text;

  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text?.trim()) {
        return content.text;
      }
    }
  }

  return "";
}

export function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function asTrimmedString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function asStringArray(value: unknown, options?: { min?: number; max?: number }) {
  if (!Array.isArray(value)) return null;

  const trimmed = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);

  if ((options?.min ?? 0) > trimmed.length) return null;
  return typeof options?.max === "number" ? trimmed.slice(0, options.max) : trimmed;
}

export function parseStructuredModelOutput<T>(value: string, validate: (input: unknown) => T | null): T | null {
  const exact = tryParseJson(value, validate);
  if (exact) return exact;

  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start < 0 || end <= start) return null;

  return tryParseJson(value.slice(start, end + 1), validate);
}

function tryParseJson<T>(value: string, validate: (input: unknown) => T | null) {
  try {
    return validate(JSON.parse(value));
  } catch {
    return null;
  }
}
