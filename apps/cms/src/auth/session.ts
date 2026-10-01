import {
  createLocalReq,
  getFieldsToSign,
  jwtSign,
  type Payload,
  type PayloadRequest,
  type TypedUser,
} from "payload"
import { addSessionToUser, generatePayloadCookie } from "payload/shared"

import type { User } from "@workspace/cms-types"

/**
 * Starts a normal Payload session for a Staff User, the same way Payload's
 * login operation does (a session row on the user, then a signed JWT
 * carrying its `sid`), and returns the `payload-token` Set-Cookie value.
 * Payload's own JWT strategy then authenticates every later request, so all
 * access rules apply unchanged.
 */
export async function issueSession(
  payload: Payload,
  userId: number | string
): Promise<string> {
  const collection = payload.collections.users
  const collectionConfig = collection.config
  const req = await createLocalReq({}, payload)

  const user = (await payload.db.findOne({
    collection: collectionConfig.slug,
    where: { id: { equals: userId } },
    req,
  })) as User | null
  if (!user) throw new Error(`Staff User ${userId} not found`)

  const { sid } = await addSessionToUser({
    collectionConfig,
    payload,
    req,
    user: user as TypedUser,
  })
  const fieldsToSign = getFieldsToSign({
    collectionConfig,
    email: user.email,
    sid,
    user: { ...user, collection: "users" } as PayloadRequest["user"],
  })
  const { token } = await jwtSign({
    fieldsToSign,
    secret: payload.secret,
    tokenExpiration: collectionConfig.auth.tokenExpiration,
  })

  return generatePayloadCookie({
    collectionAuthConfig: collectionConfig.auth,
    cookiePrefix: payload.config.cookiePrefix,
    token,
  }) as string
}
