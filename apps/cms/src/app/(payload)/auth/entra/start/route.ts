import config from "@payload-config"
import { getPayload } from "payload"

import { readEntraConfig, startSignIn } from "../../../../../auth"

export async function GET(request: Request) {
  return startSignIn(request, await getPayload({ config }), readEntraConfig())
}
