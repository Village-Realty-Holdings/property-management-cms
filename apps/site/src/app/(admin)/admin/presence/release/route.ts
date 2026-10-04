import { parsePresenceTarget, releasePresenceAs } from "@/admin/presence"
import { readUser } from "@/admin/session"

/**
 * The editor's `sendBeacon` on leaving (pagehide, or unmount): lets go of the
 * Page, Layout or Theme it was holding. It releases only the caller's own
 * presence, so it is safe to send in any state. The session cookie is
 * SameSite=Lax, so a cross-site POST arrives signed out and needs no CSRF
 * token. Never redirects: a beacon cannot follow one.
 */
export async function POST(request: Request) {
  const session = await readUser()
  if (!session) return new Response(null, { status: 401 })
  const form = await request.formData().catch(() => null)
  const target =
    form && parsePresenceTarget({ kind: form.get("kind"), id: form.get("id") })
  if (!target) return new Response(null, { status: 400 })
  await releasePresenceAs(session.payload, session.as, target).catch(() => {})
  return new Response(null, { status: 204 })
}
