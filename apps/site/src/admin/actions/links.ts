"use server"

import config from "@payload-config"
import { headers } from "next/headers"
import { getPayload } from "payload"

import type { User } from "../../payload-types"
import type { LinkUse } from "../links/screen"
import { linksToPathAs } from "../links/pathLinks"

/**
 * What still links to a Published Page's old path, for the Page tab's warning
 * when its path is changed. It is a background lookup fired while the User
 * types, so with no session left it answers nothing instead of redirecting to
 * sign-in (which would move them off the editor mid-edit); the warning is
 * advice, and the caller also shows nothing when the lookup fails. Reads as
 * the User, access rules applied.
 */
export async function linksToPath(path: string): Promise<LinkUse[]> {
  if (typeof path !== "string") return []
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user || user.collection !== "users") return []
  const current = user as User & { collection: "users" }
  return linksToPathAs(
    payload,
    { overrideAccess: false, user: current },
    path.slice(0, 500),
    { siteUrl: process.env.SITE_URL }
  )
}
