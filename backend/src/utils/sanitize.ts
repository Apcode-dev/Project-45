/**
 * Escapes regex special characters in user search input to prevent ReDoS / RegExp Injection attacks.
 * Also limits maximum query length to 100 characters (Item 43).
 */
export function sanitizeSearchQuery(query?: string): string {
  if (!query || typeof query !== "string") return "";
  const trimmed = query.trim().slice(0, 100);
  return trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
