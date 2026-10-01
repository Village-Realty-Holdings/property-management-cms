import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"

/**
 * Loading states use skeletons, never spinners on a blank page. Each preset is
 * a single `role="status"` region: screen readers hear the label once, and the
 * grey blocks are hidden from them. Use them in `loading.tsx` and Suspense
 * fallbacks. The pulse stops for people who prefer reduced motion (admin-kit.css).
 */
export { Skeleton }

function Loading({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      data-slot="loading"
      className={className}
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  )
}

/** A list/table while its rows load: a header row and `rows` rows. */
export function TableSkeleton({
  rows = 5,
  columns = 4,
  label = "Loading…",
  className,
}: {
  rows?: number
  columns?: number
  label?: string
  className?: string
}) {
  const grid = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }
  return (
    <Loading
      label={label}
      className={cn("rounded-xl border bg-card", className)}
    >
      <div className="grid gap-4 border-b p-4" style={grid}>
        {Array.from({ length: columns }, (_, c) => (
          <Skeleton key={c} className="h-3 w-2/3" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div
          key={r}
          className="grid gap-4 border-b p-4 last:border-b-0"
          style={grid}
        >
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton key={c} className="h-4" />
          ))}
        </div>
      ))}
    </Loading>
  )
}

/** A card while its content loads: a heading line and `lines` text lines. */
export function CardSkeleton({
  lines = 3,
  label = "Loading…",
  className,
}: {
  lines?: number
  label?: string
  className?: string
}) {
  return (
    <Loading
      label={label}
      className={cn("rounded-xl border bg-card p-4", className)}
    >
      <Skeleton className="mb-4 h-5 w-1/3" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} className={cn("h-4", i === lines - 1 && "w-2/3")} />
        ))}
      </div>
    </Loading>
  )
}

/** The page header (title, description, action) while the screen loads. */
export function PageHeaderSkeleton({ label = "Loading…" }: { label?: string }) {
  return (
    <Loading label={label} className="mb-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-2 h-4 w-80 max-w-full" />
    </Loading>
  )
}
