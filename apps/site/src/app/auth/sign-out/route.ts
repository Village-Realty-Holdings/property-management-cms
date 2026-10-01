import { signOut } from "@/auth"

export function GET(request: Request) {
  return signOut(request)
}

export function POST(request: Request) {
  return signOut(request)
}
