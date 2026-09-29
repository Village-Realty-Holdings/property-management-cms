import { cookies } from "next/headers"
import type { Payload, TypedUser } from "payload"

import type { Site } from "@workspace/cms-types"

/**
 * The Site selected in the admin (the multi-tenant plugin's
 * `payload-tenant` cookie), read with the user's access. Null when no Site
 * is selected ("All Sites") or the user can't read it.
 */
export async function findActiveSite(
  payload: Payload,
  user: TypedUser | null | undefined
): Promise<Site | null> {
  if (!user) return null
  const cookie = (await cookies()).get("payload-tenant")?.value
  const id =
    cookie && payload.db.defaultIDType === "number" ? Number(cookie) : cookie
  if (id === undefined || id === "" || Number.isNaN(id)) return null
  return payload
    .findByID({
      collection: "sites",
      id,
      depth: 0,
      disableErrors: true,
      overrideAccess: false,
      user,
    })
    .catch(() => null)
}
