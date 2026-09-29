import config from "@payload-config"
import { getPayload } from "payload"

import { finishSignIn, readEntraConfig } from "../../../../../auth"

export async function GET(request: Request) {
  return finishSignIn(request, await getPayload({ config }), readEntraConfig())
}
