import config from "@payload-config"
import { getPayload } from "payload"

import { finishSignIn, readEntraConfig } from "@/auth"

export async function POST(request: Request) {
  return finishSignIn(request, await getPayload({ config }), readEntraConfig())
}
