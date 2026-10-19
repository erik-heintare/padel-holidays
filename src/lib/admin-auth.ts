/** Constant-time string compare that works in every runtime (no node:crypto). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Checks an `Authorization: Basic` header against ADMIN_PASSWORD (any username). Fails closed when unset. */
export function isAdminAuthorized(authHeader: string | null): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || !authHeader?.startsWith("Basic ")) return false;
  try {
    const decoded = atob(authHeader.slice(6));
    const supplied = decoded.slice(decoded.indexOf(":") + 1);
    return safeEqual(supplied, password);
  } catch {
    return false;
  }
}
