import Link from "next/link"
import { ExternalLinkIcon, LogOutIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"

import type { SiteCard } from "../dashboard/site"
import { SIGN_OUT_PATH } from "@/auth"
import { AdminNav } from "./AdminNav"

/**
 * The Admin's sidebar: the Site's logo and name with its schema badge, the
 * navigation, and at the foot View Site, the User and sign out.
 */
export function AdminSidebar({
  site,
  user,
}: {
  site: SiteCard
  user: { name?: string | null; email: string }
}) {
  return (
    <aside
      aria-label="Site"
      className="flex flex-col gap-6 border-b bg-background p-4 md:sticky md:top-0 md:h-svh md:w-60 md:shrink-0 md:overflow-y-auto md:border-r md:border-b-0"
    >
      <div className="flex items-center gap-3 px-3">
        {site.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={site.logo.url}
            alt=""
            className="size-8 shrink-0 rounded-md object-contain"
          />
        )}
        <div className="flex min-w-0 flex-col items-start gap-1">
          <Link
            href="/admin"
            className="max-w-full truncate text-base font-semibold"
            title={site.name}
          >
            {site.name}
          </Link>
          <Badge
            variant="outline"
            className="max-w-full justify-start font-mono"
            title={`Database schema: ${site.schema}`}
          >
            <span className="sr-only">Database schema: </span>
            <span className="truncate">{site.schema}</span>
          </Badge>
        </div>
      </div>
      <AdminNav />
      <div className="mt-auto flex flex-col gap-2 px-3 text-sm">
        <a
          href={site.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-md text-muted-foreground hover:text-foreground"
        >
          <ExternalLinkIcon className="size-4" aria-hidden="true" /> View Site
          <span className="sr-only">(opens in a new tab)</span>
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
  )
}
