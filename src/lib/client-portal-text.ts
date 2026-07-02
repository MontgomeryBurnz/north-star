function normalizeListText(value: string) {
  return value.replace(/\r\n?/g, "\n").trim();
}

function stripBulletMarker(value: string) {
  return value.replace(/^\s*[-*•]\s+/, "").trim();
}

export function splitClientPortalListText(value: string | undefined | null) {
  const raw = normalizeListText(String(value ?? ""));
  if (!raw) return [];

  const lineItems = raw
    .split("\n")
    .map(stripBulletMarker)
    .filter(Boolean);

  if (lineItems.length > 1) return lineItems;

  const normalized = raw.replace(/\s+/g, " ").trim();
  const withoutLeadingMarker = stripBulletMarker(normalized);
  const dashItems = withoutLeadingMarker
    .split(/\s+-\s+(?=[A-Z0-9(])/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (/^\s*[-*•]\s+/.test(normalized) && dashItems.length > 1) return dashItems;

  const bulletItems = normalized
    .split(/\s+•\s+/)
    .map(stripBulletMarker)
    .filter(Boolean);

  if (bulletItems.length > 1) return bulletItems;

  return [withoutLeadingMarker || normalized];
}

export function shouldRenderClientPortalList(value: string | undefined | null) {
  const raw = normalizeListText(String(value ?? ""));
  if (!raw) return false;
  if (raw.includes("\n")) return true;
  if (/^\s*[-*•]\s+/.test(raw)) return splitClientPortalListText(raw).length > 1;
  if (/\s+•\s+/.test(raw)) return true;
  return false;
}
