import type { ReactNode } from "react"
import Link from "next/link"
import { ExternalLinkIcon, LogOutIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { AdminNav } from "@/admin/components/AdminNav"
import { requireStaff } from "@/admin/session"
import { SIGN_OUT_PATH } from "@/auth"

/** The signed-in Admin: sidebar with navigation and the Staff User. */
export default async function AdminShellLayout({
  children,
}: {
  children: ReactNode
}) {
  const { user } = await requireStaff()
  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <aside className="flex flex-col gap-6 border-b bg-background p-4 md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <Link href="/admin" className="px-3 text-base font-semibold">
          Site Builder
        </Link>
        <AdminNav />
        <div className="mt-auto flex flex-col gap-2 px-3 text-sm">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ExternalLinkIcon className="size-4" /> View Site
          </a>
          <div className="flex items-center justify-between gap-2 border-t pt-3">
            <span className="truncate text-muted-foreground" title={user.email}>
              {user.name || user.email}
            </span>
            <form action={SIGN_OUT_PATH} method="post">
              <Button
                type="submit"
                variant="ghost"
                size="icon-sm"
                aria-label="Sign out"
              >
                <LogOutIcon />
              </Button>
            </form>
          </div>
        </div>
      </aside>
      <main className="flex-1 p-4 sm:p-8">{children}</main>
    </div>
  )
}
