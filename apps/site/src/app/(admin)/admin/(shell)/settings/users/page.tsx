import type { Metadata } from "next"

import { UsersList } from "@/admin/components/users/UsersList"
import { requireUser } from "@/admin/session"
import { loadUsersScreen } from "@/admin/users"

export const metadata: Metadata = { title: "Users" }

/** Users: who can sign in to Awayday Sites, and which Sites each can use. */
export default async function UsersPage() {
  const { payload, as } = await requireUser()
  return <UsersList screen={await loadUsersScreen(payload, as)} />
}
