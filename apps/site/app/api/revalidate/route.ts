import { revalidateTag } from "next/cache"

import { bearerMatches, parseRevalidateBody } from "@/lib/revalidate"
import { readSiteEnv } from "@/lib/site"

/**
 * `POST /api/revalidate` (ADR-0009): the CMS sends the cache tags affected by
 * a change, authenticated with this Site's shared secret.
 * 401 on a wrong secret, 400 on a bad body, 200 `{ revalidated: n }`.
 */
export async function POST(request: Request) {
  const secret = readSiteEnv().revalidationSecret
  if (!secret) {
    return Response.json(
      { error: "REVALIDATION_SECRET is not set on this deployment" },
      { status: 500 }
    )
  }
  if (!bearerMatches(request.headers.get("authorization"), secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 })
  }
  const parsed = parseRevalidateBody(body)
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 })

  for (const tag of parsed.tags) revalidateTag(tag, "max")
  return Response.json({ revalidated: parsed.tags.length })
}
