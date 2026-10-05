"use client"

import { useState } from "react"
import { PencilIcon, PlusIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { Switch } from "@workspace/ui/components/switch"

import { deleteRegistryUser, saveUser } from "../../actions/users"
import type { FormState } from "../../formState"
import { ConfirmDialog, InlineError, notify, PageHeader } from "../../kit"
import type { UserRow, UsersScreen } from "../../users"
import { describedBy, FormField } from "../FormBits"
import { useFormAction } from "../useFormAction"

const MIN_PASSWORD = 12

/**
 * The Users screen (apps/site ADR-0015). Users and the Sites they can use
 * live in the Registry, shared by every Site: one account signs in anywhere
 * it has Site Access. A Super Admin adds Users, gives and takes Site Access,
 * sets passwords and disables or deletes accounts; everyone else sees who can
 * use this Site.
 */
export function UsersList({ screen }: { screen: UsersScreen }) {
  const { canManage, here, sites, rows } = screen
  const [editing, setEditing] = useState<UserRow | "new" | null>(null)
  const [deleting, setDeleting] = useState<UserRow | null>(null)
  const siteName = (id: number) => {
    const site = sites.find((s) => s.id === id)
    return site?.name || site?.schema || `Site ${id}`
  }
  const label = (row: UserRow) => row.name || row.email

  return (
    <>
      <PageHeader
        title="Users"
        description={
          canManage
            ? "Everyone who can sign in to Awayday Sites, and the Sites each can use. One account works on every Site it has access to."
            : "The people who can use this Site’s Admin. Ask a Super Admin to change who has access."
        }
        action={
          canManage && (
            <Button type="button" onClick={() => setEditing("new")}>
              <PlusIcon aria-hidden="true" /> Add User
            </Button>
          )
        }
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
                Signs in with
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Access
              </th>
              {canManage && (
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b align-middle last:border-0 hover:bg-muted/50"
              >
                <th scope="row" className="px-4 py-3 text-left font-normal">
                  <span className="flex flex-wrap items-center gap-2 font-medium">
                    {row.name || (
                      <span className="text-muted-foreground">No name</span>
                    )}
                    {row.isYou && <Badge variant="secondary">You</Badge>}
                    {row.disabled && <Badge variant="outline">Disabled</Badge>}
                  </span>
                  <span className="text-muted-foreground">{row.email}</span>
                </th>
                <td className="px-4 py-3 text-muted-foreground">
                  {[row.entraOid && "Microsoft", row.hasPassword && "Password"]
                    .filter(Boolean)
                    .join(", ") || "Microsoft (on first sign-in)"}
                </td>
                <td className="px-4 py-3">
                  {row.isSuperAdmin ? (
                    <Badge>Super Admin · every Site</Badge>
                  ) : row.siteIds.length === 0 ? (
                    <span className="text-muted-foreground">No Sites</span>
                  ) : (
                    <span className="flex flex-wrap gap-1">
                      {row.siteIds.map((id) => (
                        <Badge
                          key={id}
                          variant={id === here.id ? "secondary" : "outline"}
                        >
                          {siteName(id)}
                        </Badge>
                      ))}
                    </span>
                  )}
                </td>
                {canManage && (
                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Edit ${label(row)}`}
                      onClick={() => setEditing(row)}
                    >
                      <PencilIcon />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canManage && (
        <Sheet
          open={editing !== null}
          onOpenChange={(open) => !open && setEditing(null)}
        >
          <SheetContent className="overflow-y-auto sm:max-w-md">
            {editing !== null && (
              <UserForm
                key={editing === "new" ? "new" : editing.id}
                user={editing === "new" ? null : editing}
                screen={screen}
                onDone={() => setEditing(null)}
                onDelete={(row) => {
                  setEditing(null)
                  setDeleting(row)
                }}
              />
            )}
          </SheetContent>
        </Sheet>
      )}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete “${deleting ? label(deleting) : ""}”?`}
        description="They can no longer sign in to any Site. Their name stays on what they edited. To stop them for now and keep the account, disable it instead."
        showDependents={false}
        confirmLabel="Delete User"
        onConfirm={async () => {
          const result = await deleteRegistryUser(deleting!.id)
          if (result.ok) notify.success(result.message ?? "Deleted")
          return result
        }}
      />
    </>
  )
}

const FORM_ID = "user-form"

function UserForm({
  user,
  screen,
  onDone,
  onDelete,
}: {
  user: UserRow | null
  screen: UsersScreen
  onDone: () => void
  onDelete: (row: UserRow) => void
}) {
  const { state, pending, submit, errors } = useFormAction(
    (_previous: FormState, data: FormData) => saveUser(user?.id ?? null, data),
    onDone
  )
  const [superAdmin, setSuperAdmin] = useState(user?.isSuperAdmin ?? false)
  const isYou = user?.isYou ?? false

  return (
    <form
      id={FORM_ID}
      noValidate
      onSubmit={submit}
      className="flex min-h-0 flex-1 flex-col"
    >
      <SheetHeader>
        <SheetTitle>{user ? "Edit User" : "Add User"}</SheetTitle>
        <SheetDescription>
          {user
            ? user.email
            : "They sign in with Microsoft using this email, or with the password you set."}
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4">
        {state.ok === false && state.message && (
          <InlineError>{state.message}</InlineError>
        )}
        {!user && (
          <FormField id="user-email" label="Email" error={errors.email}>
            <Input
              id="user-email"
              name="email"
              type="email"
              required
              autoComplete="off"
              {...describedBy("user-email", { error: errors.email })}
            />
          </FormField>
        )}
        <FormField id="user-name" label="Name" error={errors.name}>
          <Input
            id="user-name"
            name="name"
            defaultValue={user?.name ?? ""}
            autoComplete="off"
            {...describedBy("user-name", { error: errors.name })}
          />
        </FormField>
        <FormField
          id="user-password"
          label={user?.hasPassword ? "New password" : "Password"}
          description={`Optional, at least ${MIN_PASSWORD} characters. ${
            user?.hasPassword
              ? "Leave empty to keep the current one."
              : "Without one, they sign in with Microsoft."
          }`}
          error={errors.password}
        >
          <Input
            id="user-password"
            name="password"
            type="password"
            autoComplete="new-password"
            {...describedBy("user-password", {
              description: true,
              error: errors.password,
            })}
          />
        </FormField>
        {user?.hasPassword && (
          <div className="flex items-center gap-2">
            <Checkbox id="user-remove-password" name="removePassword" />
            <Label htmlFor="user-remove-password">
              Remove their password (Microsoft only)
            </Label>
          </div>
        )}

        <div className="flex items-start gap-3">
          <Switch
            id="user-super-admin"
            name="superAdmin"
            checked={superAdmin}
            onCheckedChange={setSuperAdmin}
            disabled={isYou}
          />
          <div className="flex flex-col gap-1">
            <Label htmlFor="user-super-admin">Super Admin</Label>
            <p className="text-sm text-muted-foreground">
              Can use every Site, and manage Users and Site Access.
            </p>
          </div>
          {isYou && <input type="hidden" name="superAdmin" value="on" />}
        </div>

        <fieldset className="flex flex-col gap-2" disabled={superAdmin}>
          <legend className="mb-1 text-sm font-medium">Site Access</legend>
          {superAdmin ? (
            <p className="text-sm text-muted-foreground">
              A Super Admin can use every Site.
            </p>
          ) : (
            screen.sites.map((site) => (
              <div key={site.id} className="flex items-center gap-2">
                <Checkbox
                  id={`user-site-${site.id}`}
                  name="site"
                  value={String(site.id)}
                  defaultChecked={user?.siteIds.includes(site.id)}
                />
                <Label htmlFor={`user-site-${site.id}`}>
                  {site.name || site.schema}
                  {site.id === screen.here.id && (
                    <span className="text-muted-foreground"> (this Site)</span>
                  )}
                </Label>
              </div>
            ))
          )}
        </fieldset>

        {user && !isYou && (
          <div className="flex items-start gap-3">
            <Switch
              id="user-disabled"
              name="disabled"
              defaultChecked={user.disabled}
            />
            <div className="flex flex-col gap-1">
              <Label htmlFor="user-disabled">Disabled</Label>
              <p className="text-sm text-muted-foreground">
                Signed out of every Site at once, and can’t sign in again until
                enabled.
              </p>
            </div>
          </div>
        )}
      </div>

      <SheetFooter className="flex-row justify-between">
        {user && !isYou ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive-text"
            onClick={() => onDelete(user)}
          >
            Delete
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : user ? "Save" : "Add User"}
        </Button>
      </SheetFooter>
    </form>
  )
}
