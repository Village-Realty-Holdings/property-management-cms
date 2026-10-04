import { deliverGuestFeedback } from "@/site/guestFeedback"
import { parseGuestFeedback } from "@/site/guestSurvey"
import { getBrand } from "@/site/queries"

/** A guest's answers are a few short fields: anything bigger is not one. */
const MAX_BYTES = 10_000

/**
 * Receives the Guest feedback survey Block's feedback form and passes it to the guest
 * care team (src/site/guestFeedback.ts). Open to visitors, so everything is
 * checked again here and nothing is stored on the Site. The `website` field
 * is a trap no person sees: a submission that fills it is answered as sent
 * and dropped.
 */
export async function POST(request: Request) {
  const body = await request.text()
  if (body.length > MAX_BYTES) {
    return Response.json({ ok: false }, { status: 413 })
  }
  let input: unknown
  try {
    input = JSON.parse(body)
  } catch {
    return Response.json({ ok: false }, { status: 400 })
  }
  if ((input as { website?: unknown } | null)?.website) {
    return Response.json({ ok: true })
  }
  const parsed = parseGuestFeedback(input)
  if (!parsed.ok) {
    return Response.json(
      { ok: false, message: parsed.message, errors: parsed.errors },
      { status: 400 }
    )
  }
  const brand = await getBrand()
  const delivered = await deliverGuestFeedback(
    {
      ...parsed.feedback,
      site: brand.name?.trim() || "Awayday",
      siteUrl: process.env.SITE_URL?.trim() || null,
    },
    { env: process.env, fetch }
  )
  if (!delivered.ok) {
    console.error(`Guest feedback was not delivered: ${delivered.reason}`)
    return Response.json({ ok: false }, { status: 502 })
  }
  return Response.json({ ok: true })
}
