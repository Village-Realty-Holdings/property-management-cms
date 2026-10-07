import { entraCallback, readEntraConfig } from "@/auth"

export function GET() {
  return entraCallback(readEntraConfig())
}
