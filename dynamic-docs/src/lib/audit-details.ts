const sensitiveKeyPattern = /password|token|secret|authorization|cookie|credential|private.?key/i;

function redactSensitiveValues(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitiveValues);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      sensitiveKeyPattern.test(key) ? "[REDACTED]" : redactSensitiveValues(entry),
    ]),
  );
}

export function formatAuditDetails(detailsJson: string): string {
  let details: unknown;
  try {
    details = JSON.parse(detailsJson) as unknown;
  } catch {
    return "审计详情格式无效";
  }
  return JSON.stringify(redactSensitiveValues(details), null, 2);
}
