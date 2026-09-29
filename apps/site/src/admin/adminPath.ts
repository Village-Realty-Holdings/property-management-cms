/**
 * Request header carrying the requested Admin path and query, set by
 * src/proxy.ts, so a sign-in redirect from any layout or page can come
 * back to it. Layouts can't read the URL themselves.
 */
export const ADMIN_PATH_HEADER = "x-admin-path"
