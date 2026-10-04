import type { Payload, Where } from "payload"

import type { UserAccess } from "./dashboard/queries"

/**
 * Presence: who else has a Page, a Layout or the Theme open in the Visual
 * Editor. It is stored as Payload's own document locks (the
 * `payload-locked-documents` collection, which any signed-in User may write),
 * so Payload's /p-admin shows the same holder.
 *
 * Presence is information only. Payload deletes a target's lock rows on every
 * write to it, so a lock can never guard a save; that is the stale-save
 * check's job. Nothing here passes `overrideLock`.
 *
 * One holder per target, as in Payload: the newest fresh row. A heartbeat
 * (touch) is an upsert, because any save by anyone wipes every row for the
 * target; the saver touches again at once and the other holders claim again
 * on their next heartbeat (see usePresence).
 *
 * Known limits: one person in two tabs sees no banner, and closing one tab
 * releases until the other's next heartbeat. A hidden tab stops its heartbeat
 * and its row expires after five minutes. A rare race can briefly show a wrong
 * "took over"; that is acceptable because presence only informs.
 */

export type PresenceTarget =
  | { kind: "page"; id: number }
  | { kind: "layout"; id: number }
  | { kind: "theme" }

export type Presence =
  | { status: "yours" }
  | { status: "free" }
  | { status: "other"; name: string }

/** Payload's default lock expiry (lockDurationDefault, 300 s). */
export const PRESENCE_TTL_MS = 5 * 60 * 1000
export const RELEASE_PATH = "/admin/presence/release"

const LOCKS = "payload-locked-documents"

/**
 * Validates what the browser sent: an object, or FormData fields as strings.
 * An id is a positive safe integer; "12" is accepted.
 */
export function parsePresenceTarget(input: unknown): PresenceTarget | null {
  if (typeof input !== "object" || input === null) return null
  const { kind, id } = input as { kind?: unknown; id?: unknown }
  if (kind === "theme") return { kind: "theme" }
  if (kind !== "page" && kind !== "layout") return null
  const number =
    typeof id === "number"
      ? id
      : typeof id === "string" && /^\d+$/.test(id)
        ? Number(id)
        : NaN
  if (!Number.isSafeInteger(number) || number <= 0) return null
  return { kind, id: number }
}

/** The beacon body: kind=page&id=12, or kind=theme. */
export function presenceBody(target: PresenceTarget): URLSearchParams {
  const body = new URLSearchParams({ kind: target.kind })
  if (target.kind !== "theme") body.set("id", String(target.id))
  return body
}

/** A stable key for effects: "page:12", "layout:3", "theme". */
export function presenceKey(target: PresenceTarget): string {
  return target.kind === "theme" ? "theme" : `${target.kind}:${target.id}`
}

function targetWhere(target: PresenceTarget): Where {
  if (target.kind === "theme") return { globalSlug: { equals: "theme" } }
  return {
    and: [
      {
        "document.relationTo": {
          equals: target.kind === "page" ? "pages" : "layouts",
        },
      },
      { "document.value": { equals: target.id } },
    ],
  }
}

type LockRow = {
  id: number
  updatedAt: string
  user: { value: number | { id: number; name?: string | null; email: string } }
}

function ownerId(row: LockRow): number {
  const value = row.user.value
  return typeof value === "object" ? value.id : value
}

function ownerName(row: LockRow): string {
  const value = row.user.value
  if (typeof value !== "object") return "Another User"
  return value.name?.trim() || value.email
}

/** The target's rows, newest first, with the expired ones left out. */
async function freshRows(
  payload: Payload,
  access: UserAccess,
  target: PresenceTarget,
  now: Date
): Promise<LockRow[]> {
  const { docs } = await payload.find({
    collection: LOCKS,
    where: targetWhere(target),
    sort: "-updatedAt",
    depth: 1,
    pagination: false,
    ...access,
  })
  const since = now.getTime() - PRESENCE_TTL_MS
  return (docs as unknown as LockRow[]).filter(
    (row) => new Date(row.updatedAt).getTime() > since
  )
}

function view(rows: LockRow[], me: number): Presence {
  const holder = rows[0]
  if (!holder) return { status: "free" }
  if (ownerId(holder) === me) return { status: "yours" }
  return { status: "other", name: ownerName(holder) }
}

/** Who holds the target now. Writes nothing. */
export async function readPresenceAs(
  payload: Payload,
  access: UserAccess,
  target: PresenceTarget,
  options: { now?: Date } = {}
): Promise<Presence> {
  const rows = await freshRows(
    payload,
    access,
    target,
    options.now ?? new Date()
  )
  return view(rows, access.user.id)
}

/**
 * A heartbeat. Claims the target for the User unless another User holds it
 * (then "other", and nothing is written); `takeOver` claims it regardless.
 * Errors propagate: a Page that no longer exists fails its foreign key.
 */
export async function touchPresenceAs(
  payload: Payload,
  access: UserAccess,
  target: PresenceTarget,
  options: { takeOver?: boolean; now?: Date } = {}
): Promise<Exclude<Presence, { status: "free" }>> {
  const me = access.user.id
  const rows = await freshRows(
    payload,
    access,
    target,
    options.now ?? new Date()
  )
  const holder = view(rows, me)
  if (holder.status === "other" && !options.takeOver) return holder

  // Expired rows are not in `rows`; the claim removes them too.
  const { docs: all } = await payload.find({
    collection: LOCKS,
    where: targetWhere(target),
    depth: 0,
    pagination: false,
    ...access,
  })
  const mine = (all as unknown as { id: number; user: { value: number } }[])
    .filter((row) => row.user.value === me)
    .at(0)
  const others = all.filter((row) => row.id !== mine?.id)
  if (others.length > 0) {
    await payload.delete({
      collection: LOCKS,
      where: mine
        ? { and: [targetWhere(target), { id: { not_equals: mine.id } }] }
        : targetWhere(target),
      ...access,
    })
  }
  const user = { relationTo: "users" as const, value: me }
  if (mine) {
    await payload.update({
      collection: LOCKS,
      id: mine.id,
      data: { user },
      ...access,
    })
  } else {
    await payload.create({
      collection: LOCKS,
      data:
        target.kind === "theme"
          ? { globalSlug: "theme", user }
          : {
              document: {
                relationTo: target.kind === "page" ? "pages" : "layouts",
                value: target.id,
              },
              user,
            },
      ...access,
    })
  }
  return { status: "yours" }
}

/** Leaves the target: deletes only the User's own rows. */
export async function releasePresenceAs(
  payload: Payload,
  access: UserAccess,
  target: PresenceTarget
): Promise<void> {
  await payload.delete({
    collection: LOCKS,
    where: {
      and: [targetWhere(target), { "user.value": { equals: access.user.id } }],
    },
    ...access,
  })
}
