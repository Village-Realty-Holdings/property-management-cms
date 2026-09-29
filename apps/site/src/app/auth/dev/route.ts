import config from "@payload-config"
import { getPayload } from "payload"

import { devSignIn, devSignInEnabled } from "@/auth"

export async function GET(request: Request) {
  if (!devSignInEnabled()) return new Response("Not Found", { status: 404 })
  return devSignIn(request, await getPayload({ config }))
}
