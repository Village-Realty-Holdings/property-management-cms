import { cn } from "@workspace/ui/lib/utils"

const block = "animate-pulse rounded-lg bg-muted motion-reduce:animate-none"

/** Placeholder cards while results load. */
export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul
      aria-hidden
      className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="flex flex-col gap-3">
          <div className={cn(block, "aspect-4/3")} />
          <div className={cn(block, "h-5 w-3/4")} />
          <div className={cn(block, "h-4 w-1/2")} />
        </li>
      ))}
    </ul>
  )
}

/** The /rentals filters and results while they load. */
export function BrowseSkeleton() {
  return (
    <div
      role="status"
      className="lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-12"
    >
      <span className="sr-only">Loading rentals…</span>
      <div aria-hidden className="hidden flex-col gap-8 lg:flex">
        {[10, 16, 24, 20].map((h, i) => (
          <div key={i} className={cn(block)} style={{ height: `${h * 4}px` }} />
        ))}
      </div>
      <div className="flex flex-col gap-8">
        <div aria-hidden className="flex items-center justify-between">
          <div className={cn(block, "h-6 w-32")} />
          <div className={cn(block, "h-9 w-44")} />
        </div>
        <GridSkeleton />
      </div>
    </div>
  )
}
