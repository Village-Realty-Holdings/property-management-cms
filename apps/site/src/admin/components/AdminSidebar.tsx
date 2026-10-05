import Link from "next/link"
import { ArrowLeftRightIcon, ExternalLinkIcon, LogOutIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"

import type { SiteCard } from "../dashboard/site"
import { HANDOFF_START_PATH, SIGN_OUT_PATH } from "@/auth"
import { AdminNav } from "./AdminNav"

/**
 * The Admin's sidebar: the Site's logo and name with its schema badge, the
 * navigation, and at the foot the other Sites to switch to (apps/site
 * ADR-0015), View Site, the User and sign out. Switching signs you in to the
 * other Site with a one-time handoff, so there's no second sign-in.
 */
export function AdminSidebar({
  site,
  user,
  otherSites = [],
}: {
  site: SiteCard
  user: { name?: string | null; email: string }
  otherSites?: { id: number; name: string }[]
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
        {otherSites.length > 0 && (
          <nav aria-label="Switch Site" className="flex flex-col gap-1 pb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Switch Site
            </span>
            {otherSites.map((other) => (
              <form key={other.id} action={HANDOFF_START_PATH} method="post">
                <input type="hidden" name="site" value={other.id} />
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-md text-left text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeftRightIcon
                    className="size-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="truncate">{other.name}</span>
                </button>
              </form>
            ))}
          </nav>
        )}
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
