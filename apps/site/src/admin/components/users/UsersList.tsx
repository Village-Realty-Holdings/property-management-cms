"use client"

import { useState } from "react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"

import { removeUser } from "../../actions/users"
import { ConfirmDialog, notify, PageHeader } from "../../kit"
import type { UserRow } from "../../users"

/**
 * The Users screen: the people who can sign into this Site's Admin. A User is
 * created by their first sign-in, so there is no Add; Remove takes them off
 * this Site. You can't remove yourself.
 */
export function UsersList({ rows }: { rows: UserRow[] }) {
  const [removing, setRemoving] = useState<UserRow | null>(null)
  const label = (row: UserRow) => row.name || row.email

  return (
    <>
      <PageHeader
        title="Users"
        description="The people who can sign into this Site’s Admin."
      />
      <div className="overflow-x-auto rounded-xl border bg-background">
        <table className="w-full text-sm">
          <caption className="sr-only">Users</caption>
          <thead className="border-b text-left text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Name
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Email
              </th>
              <th scope="col" className="px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b align-middle last:border-0 hover:bg-muted/50"
              >
                <th scope="row" className="px-4 py-3 text-left font-medium">
                  <span className="flex items-center gap-2">
                    {row.name || (
                      <span className="text-muted-foreground">No name</span>
                    )}
                    {row.isYou && <Badge variant="secondary">You</Badge>}
                  </span>
                </th>
                <td className="px-4 py-3 text-muted-foreground">{row.email}</td>
                <td className="px-4 py-3 text-right">
                  {!row.isYou && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      aria-label={`Remove ${label(row)}`}
                      onClick={() => setRemoving(row)}
                    >
                      Remove
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remove “${removing ? label(removing) : ""}”?`}
        description="They can no longer use the Admin on this Site, but they can sign in again for as long as they hold the Entra app role. To stop that, take the role away in Entra ID."
        showDependents={false}
        confirmLabel="Remove User"
        onConfirm={async () => {
          const result = await removeUser(removing!.id)
          if (result.ok) notify.success(result.message ?? "Removed")
          return result
        }}
      />
    </>
  )
}
