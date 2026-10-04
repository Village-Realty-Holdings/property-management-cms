import type { Metadata } from "next"

import { UsersList } from "@/admin/components/users/UsersList"
import { requireUser } from "@/admin/session"
import { loadUserRows } from "@/admin/users"

export const metadata: Metadata = { title: "Users" }

/** Users: the people who can sign into this Site's Admin, to remove. */
export default async function UsersPage() {
  const { payload, as } = await requireUser()
  return <UsersList rows={await loadUserRows(payload, as)} />
}
