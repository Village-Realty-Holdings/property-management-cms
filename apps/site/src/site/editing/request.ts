import "server-only"

import config from "@payload-config"
import { headers } from "next/headers"
import { getPayload } from "payload"
import { cache } from "react"

import { isEditingRequest } from "./flag"

/**
 * Whether the request carries a signed-in Staff User's session. Read once per
 * request. Never redirects and never throws: the editing flag is for Staff
 * Users only, so for anyone else it is simply ignored and the Site answers as
 * it does for a visitor.
 */
export const isStaffRequest = cache(async (): Promise<boolean> => {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: await headers() })
    return user?.collection === "users"
  } catch {
    return false
  }
})

/**
 * Whether this request is for the Visual Editor's canvas: the editing flag
 * from a signed-in Staff User. The flag is checked first so an ordinary Site
 * request never pays for the session lookup.
 */
export async function isEditingCanvasRequest(
  searchParams: Record<string, string | string[] | undefined> | undefined
): Promise<boolean> {
  return isEditingRequest(searchParams) && (await isStaffRequest())
}
