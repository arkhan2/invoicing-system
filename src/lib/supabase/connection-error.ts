/**
 * Detect Supabase/network connection failures (timeout, fetch failed, etc.)
 * so we can show a friendly "can't reach server" message instead of crashing.
 */
export function isConnectionError(e: unknown): boolean {
  if (e instanceof Error) {
    if (e.message === "fetch failed") return true;
    const cause = (e as { cause?: unknown }).cause;
    if (cause && typeof cause === "object") {
      const c = cause as { code?: string; message?: string };
      if (c.code === "UND_ERR_CONNECT_TIMEOUT" || c.code === "UND_ERR_HEADERS_TIMEOUT" || c.code === "UND_ERR_BODY_TIMEOUT") return true;
      if (typeof c.message === "string" && (c.message.includes("ECONNREFUSED") || c.message.includes("ETIMEDOUT") || c.message.includes("Connect Timeout"))) return true;
    }
  }
  const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : undefined;
  if (code === "refresh_token_not_found") return false; // handled separately as "no session"
  return false;
}
