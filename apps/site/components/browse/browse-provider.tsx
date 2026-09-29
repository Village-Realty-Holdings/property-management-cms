"use client"

import {
  createContext,
  use,
  useOptimistic,
  useTransition,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"

import { cn } from "@workspace/ui/lib/utils"

import {
  browseHref,
  withChange,
  type BrowseParams,
} from "@workspace/site-views/browse/params"

type BrowseContextValue = {
  /** The filters as the guest last set them (ahead of the server while pending). */
  params: BrowseParams
  /** Applies a filter change: back to page 1, URL replaced, results refetched. */
  update: (change: Partial<BrowseParams>) => void
  /** Replaces every filter at once (e.g. "Clear all"). */
  replace: (next: BrowseParams) => void
  pending: boolean
}

const BrowseContext = createContext<BrowseContextValue | null>(null)

export function useBrowse(): BrowseContextValue {
  const value = use(BrowseContext)
  if (!value) throw new Error("useBrowse must be used inside <BrowseProvider>")
  return value
}

/**
 * Holds the /rentals filters for the client controls. The URL is the source
 * of truth: each change calls `router.replace` with the new query string
 * (so the address bar is always shareable) inside a transition, and the
 * controls show the change at once via `useOptimistic` while the server
 * renders the new results.
 */
export function BrowseProvider({
  params,
  children,
}: {
  params: BrowseParams
  children: ReactNode
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [optimistic, setOptimistic] = useOptimistic(params)

  const replace = (next: BrowseParams) => {
    startTransition(() => {
      setOptimistic(next)
      router.replace(browseHref(next), { scroll: false })
    })
  }
  const update = (change: Partial<BrowseParams>) =>
    replace(withChange(optimistic, change))

  return (
    <BrowseContext value={{ params: optimistic, update, replace, pending }}>
      {children}
    </BrowseContext>
  )
}

/** The results area: marked busy and dimmed while new results load. */
export function BrowseResults({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const { pending } = useBrowse()
  return (
    <div
      aria-busy={pending}
      className={cn(
        "transition-opacity duration-200 motion-reduce:transition-none",
        pending && "opacity-60",
        className
      )}
    >
      {children}
    </div>
  )
}
