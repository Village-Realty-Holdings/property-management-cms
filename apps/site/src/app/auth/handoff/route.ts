import config from "@payload-config"
import { getPayload } from "payload"

import { finishHandoff } from "@/auth"

export async function GET(request: Request) {
  return finishHandoff(request, await getPayload({ config }))
}
