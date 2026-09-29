import type { Payload } from "payload"

type Credentials = {
  email: string | undefined
  password: string | undefined
}

/**
 * Creates the break-glass Super Admin from the given credentials when the
 * CMS has no users yet. It does nothing when either credential is missing or
 * any user already exists. Returns whether a user was created.
 */
export async function seedBreakGlassAdmin(
  payload: Payload,
  { email, password }: Credentials
): Promise<boolean> {
  if (!email || !password) return false

  const { totalDocs } = await payload.count({ collection: "users" })
  if (totalDocs > 0) return false

  try {
    await payload.create({
      collection: "users",
      data: { email, password, name: "Break-glass admin" },
    })
  } catch (error) {
    // Another instance starting at the same time may have created it first.
    const { totalDocs: now } = await payload.count({ collection: "users" })
    if (now > 0) return false
    throw error
  }
  payload.logger.info(`Created break-glass admin ${email}`)
  return true
}
