import config from "@payload-config"
import { getPayload } from "payload"

import { startHandoff } from "@/auth"

export async function POST(request: Request) {
  return startHandoff(request, await getPayload({ config }))
}
