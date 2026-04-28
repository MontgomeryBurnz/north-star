export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function firstSignal(value: string, fallback: string, separatorPattern = /\n|,|;/) {
  return (
    value
      .split(separatorPattern)
      .map((item) => item.trim())
      .filter(Boolean)[0] ?? fallback
  );
}

export function firstNonEmpty(...values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim()).find(Boolean) ?? "";
}

export function splitSignals(value: string, fallback?: string, separatorPattern = /\n|•|;/) {
  const items = value
    .split(separatorPattern)
    .map((item) => item.trim())
    .filter(Boolean);

  if (items.length) {
    return items;
  }

  return fallback ? [fallback] : [];
}

export function splitLines(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}
