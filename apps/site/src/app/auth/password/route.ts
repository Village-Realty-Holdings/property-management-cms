import config from "@payload-config"
import { getPayload } from "payload"

import { passwordSignIn } from "@/auth"

export async function POST(request: Request) {
  return passwordSignIn(request, await getPayload({ config }))
}
