import type { Payload } from "payload"

type Credentials = {
  email: string | undefined
  password: string | undefined
}

/**
 * Creates the break-glass Super Admin from the given credentials when the
 * CMS has no users yet. It does nothing when either credential is missing or
 * any user already exists, except that an existing account with the
 * break-glass email is made a Super Admin (databases seeded before the flag
 * existed). Returns whether a user was created.
 */
export async function seedBreakGlassAdmin(
  payload: Payload,
  { email, password }: Credentials
): Promise<boolean> {
  if (!email || !password) return false

  const { totalDocs } = await payload.count({ collection: "users" })
  if (totalDocs > 0) {
    await ensureSuperAdmin(payload, email)
    return false
  }

  try {
    await payload.create({
      collection: "users",
      data: {
        email,
        password,
        name: "Break-glass admin",
        role: "admin",
        superAdmin: true,
      },
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

async function ensureSuperAdmin(payload: Payload, email: string) {
  const { docs } = await payload.update({
    collection: "users",
    where: {
      and: [
        { email: { equals: email } },
        // `not_equals: true` would skip NULLs in SQL.
        {
          or: [
            { superAdmin: { equals: false } },
            { superAdmin: { exists: false } },
          ],
        },
      ],
    },
    data: { superAdmin: true },
  })
  if (docs.length > 0) {
    payload.logger.info(`Made break-glass admin ${email} a Super Admin`)
  }
}
