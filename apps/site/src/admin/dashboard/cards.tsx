import Link from "next/link"
import {
  ExternalLinkIcon,
  FileTextIcon,
  ImageUpIcon,
  LayoutTemplateIcon,
  PlusIcon,
} from "lucide-react"

import { buttonVariants } from "@workspace/ui/components/button"

import { EmptyState } from "../kit/EmptyState"
import { DashboardCard } from "./DashboardCard"
import { NEW_LAYOUT_HREF, type PageRow, type RecentItem } from "./rows"
import { themeStatusLine, type SiteCard, type ThemeSummary } from "./site"
import { StatusChip } from "./StatusChip"
import { UpdatedAt } from "./UpdatedAt"

/** How many Pages "Waiting to publish" lists before it says "and N more". */
export const WAITING_SHOWN = 5

const linkClass = "text-sm font-medium underline-offset-4 hover:underline"

/** The Site: logo, name, domain and View Site. */
export function SiteSummaryCard({ site }: { site: SiteCard }) {
  return (
    <DashboardCard id="dash-site" title="Site">
      <div className="flex items-center gap-4">
        {site.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={site.logo.url}
            alt=""
            className="size-14 shrink-0 rounded-lg border bg-muted object-contain p-1"
          />
        )}
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{site.name}</p>
          <p className="truncate text-sm text-muted-foreground">
            {site.domain ?? "Domain not set (SITE_URL)"}
          </p>
        </div>
      </div>
      <div>
        <a
          href={site.url}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: "outline" })}
        >
          View Site <ExternalLinkIcon aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>
    </DashboardCard>
  )
}

/** The last Pages and Layouts edited, newest first. */
export function ContinueEditingCard({ items }: { items: RecentItem[] }) {
  return (
    <DashboardCard id="dash-continue" title="Continue editing">
      {items.length === 0 ? (
        <EmptyState
          icon={<FileTextIcon />}
          title="Nothing to edit yet"
          description="Create your first Page and it shows up here."
          action={
            <Link href="/admin/pages/new" className={buttonVariants()}>
              <PlusIcon aria-hidden="true" /> New Page
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col divide-y">
          {items.map((item) => (
            <li
              key={`${item.kind}-${item.id}`}
              className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
            >
              <Link
                href={item.href}
                className="flex min-w-0 items-center gap-2 text-sm font-medium hover:underline"
              >
                {item.kind === "layout" ? (
                  <LayoutTemplateIcon
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                ) : (
                  <FileTextIcon
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
                <span className="truncate">{item.title}</span>
                <span className="sr-only">
                  ({item.kind === "layout" ? "Layout" : "Page"})
                </span>
              </Link>
              <span className="shrink-0 text-xs text-muted-foreground">
                <UpdatedAt iso={item.updatedAt} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  )
}

/** Pages with changes nobody has published. */
export function WaitingToPublishCard({ rows }: { rows: PageRow[] }) {
  const shown = rows.slice(0, WAITING_SHOWN)
  const more = rows.length - shown.length
  return (
    <DashboardCard id="dash-waiting" title="Waiting to publish">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing is waiting. Every Page is published.
        </p>
      ) : (
        <>
          <ul className="flex flex-col divide-y">
            {shown.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
              >
                <Link
                  href={`/admin/pages/${row.id}`}
                  className="truncate text-sm font-medium hover:underline"
                >
                  {row.title}
                </Link>
                <StatusChip status={row.status} />
              </li>
            ))}
          </ul>
          {more > 0 && (
            <Link href="/admin/pages" className={linkClass}>
              and {more} more in Pages
            </Link>
          )}
        </>
      )}
    </DashboardCard>
  )
}

/** How many Published Pages lack an SEO title or description. */
export function SeoHealthCard({ count }: { count: number }) {
  return (
    <DashboardCard id="dash-seo" title="SEO health">
      <p className="text-sm">
        {count === 0 ? (
          "Every Published Page has an SEO title and description."
        ) : (
          <>
            <span className="text-2xl font-semibold tabular-nums">{count}</span>{" "}
            Published {count === 1 ? "Page is" : "Pages are"} missing an SEO
            title or description.
          </>
        )}
      </p>
      <div>
        <Link href="/admin/settings/seo" className={linkClass}>
          {count === 0 ? "Open SEO" : "Fix in SEO"}
        </Link>
      </div>
    </DashboardCard>
  )
}

/** The Theme's colours as a labelled list of swatches with their hex codes. */
export function ThemeSwatches({ summary }: { summary: ThemeSummary }) {
  return (
    <ul className="flex flex-wrap gap-3" aria-label="Theme colours">
      {summary.swatches.map((swatch) => (
        <li key={swatch.name} className="flex items-center gap-2 text-sm">
          <span
            aria-hidden="true"
            className="size-6 rounded-full border"
            style={{ backgroundColor: swatch.hex }}
          />
          <span>
            {swatch.name}{" "}
            <span className="font-mono text-xs text-muted-foreground">
              {swatch.hex}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}

/**
 * The Theme: its swatches, when it was last saved, and View Theme. The link
 * opens the read-only Theme page, so it says View. Phase 5 replaces that page
 * with the editor and renames it Edit Theme.
 */
export function ThemeCard({ summary }: { summary: ThemeSummary }) {
  return (
    <DashboardCard id="dash-theme" title="Theme">
      <ThemeSwatches summary={summary} />
      <p className="text-sm text-muted-foreground">
        {themeStatusLine(summary)}
      </p>
      <div>
        <Link
          href="/admin/theme"
          className={buttonVariants({ variant: "outline" })}
        >
          View Theme
        </Link>
      </div>
    </DashboardCard>
  )
}

/** New Page, New Layout, Upload Media. */
export function QuickActionsCard() {
  return (
    <DashboardCard id="dash-quick" title="Quick actions">
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/pages/new" className={buttonVariants()}>
          <PlusIcon aria-hidden="true" /> New Page
        </Link>
        <Link
          href={NEW_LAYOUT_HREF}
          className={buttonVariants({ variant: "outline" })}
        >
          <LayoutTemplateIcon aria-hidden="true" /> New Layout
        </Link>
        <Link
          href="/admin/media#upload"
          className={buttonVariants({ variant: "outline" })}
        >
          <ImageUpIcon aria-hidden="true" /> Upload Media
        </Link>
      </div>
    </DashboardCard>
  )
}
