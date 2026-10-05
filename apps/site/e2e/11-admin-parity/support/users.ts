import { createHash } from "node:crypto"

import type { BrowserContext, Page } from "playwright-core"
import type { Payload } from "payload"

import { issueSession, SESSION_COOKIE } from "../../../src/auth/session"
import { findOrCreateUser } from "../../../src/auth/user"
import { ORIGIN, PAYLOAD_SECRET } from "../../theme/support/env"

/**
 * What the Admin parity specs share for two Users at once: making a second
 * User, signing them in, and reading and nudging presence.
 */

// Payload keeps sha256(config.secret).hex.slice(0, 32) as `payload.secret`.
// The test process's own Payload has the secret of .env, not the Site's, so
// the session cookie is signed with the Site's.
const SERVER_SECRET = createHash("sha256")
  .update(PAYLOAD_SECRET)
  .digest("hex")
  .slice(0, 32)

/**
 * A second User, made as a first sign-in would (Users can't be created over
 * `/api`: their `create` access is nobody).
 */
export function addUser(
  payload: Payload,
  run: string | number,
  name = `Sam Example ${run}`
) {
  return findOrCreateUser(payload, {
    entraOid: `e2e-${run}`,
    email: `sam-${run}@awayday.test`,
    name,
  })
}

/** Signs `userId` in on `context`, with the cookie the Site's own sign-in sets. */
export async function signInAs(
  context: BrowserContext,
  userId: number
): Promise<void> {
  const header = await issueSession(
    { secret: SERVER_SECRET } as Payload,
    userId,
    { secure: false }
  )
  const value = header.split(";")[0]!.slice(SESSION_COOKIE.length + 1)
  await context.addCookies([
    {
      name: SESSION_COOKIE,
      value,
      url: ORIGIN,
      httpOnly: true,
      sameSite: "Lax",
    },
  ])
}

/** Removes the User; a User that is already gone is fine. */
export async function removeUser(payload: Payload, id: number): Promise<void> {
  try {
    await payload.delete({ collection: "users", id })
  } catch {
    // Already removed.
  }
}

/** The id of the User whose lock row says they have the Page or Layout open. */
export async function holderOf(
  payload: Payload,
  collection: "pages" | "layouts",
  id: number
): Promise<number | null> {
  const { docs } = await payload.find({
    collection: "payload-locked-documents",
    where: {
      and: [
        { "document.relationTo": { equals: collection } },
        { "document.value": { equals: id } },
      ],
    },
    sort: "-updatedAt",
    depth: 0,
    limit: 1,
  })
  const value = (docs[0] as { user?: { value?: unknown } } | undefined)?.user
    ?.value
  return typeof value === "number" ? value : null
}

/**
 * Makes the editor tick now, as when its tab becomes visible again, so a spec
 * need not wait for the 60 s heartbeat.
 */
export function nudge(page: Page): Promise<void> {
  return page.evaluate(() => {
    document.dispatchEvent(new Event("visibilitychange"))
  })
}

/**
 * Waits until `userId` holds the Page or Layout, nudging `page` (the editor
 * that should claim it) as it goes. In development React remounts the editor
 * and the release beacon of the first mount can land after the second mount's
 * touch, so a spec must see the hold in the database before it relies on it.
 */
export async function waitForHolder(
  payload: Payload,
  collection: "pages" | "layouts",
  id: number,
  userId: number,
  page: Page,
  timeout = 20_000
): Promise<void> {
  const deadline = Date.now() + timeout
  let lastNudge = 0
  for (;;) {
    if ((await holderOf(payload, collection, id)) === userId) return
    if (Date.now() > deadline) {
      throw new Error(
        `User ${userId} never held ${collection}/${id} (holder: ${await holderOf(payload, collection, id)}).`
      )
    }
    if (Date.now() - lastNudge > 2_000) {
      lastNudge = Date.now()
      await nudge(page)
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
}
