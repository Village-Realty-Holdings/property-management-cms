"use client"

import { useState } from "react"
import { UsersIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import type { PresenceTarget } from "../presence"
import type { PresenceView } from "./usePresence"

const THING: Record<PresenceTarget["kind"], string> = {
  page: "this Page",
  layout: "this Layout",
  theme: "the Theme",
}

/**
 * Who else is editing, as a strip under the top bar. Shown only when someone
 * else holds the Page, Layout or Theme: it informs and never blocks, and Take
 * over is one click because the other person keeps their work.
 */
export function PresenceBanner({
  view,
  kind,
  onTakeOver,
}: {
  view: PresenceView
  kind: PresenceTarget["kind"]
  onTakeOver: () => Promise<void>
}) {
  const [pending, setPending] = useState(false)
  if (view.status !== "other") return null
  const thing = THING[kind]

  async function takeOver() {
    setPending(true)
    try {
      await onTakeOver()
    } finally {
      setPending(false)
    }
  }

  return (
    <p
      role="status"
      className="flex shrink-0 items-center gap-3 border-b border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <UsersIcon aria-hidden className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        {view.tookOver
          ? `${view.name} took over ${thing}. Your unsaved changes are still here.`
          : `${view.name} is editing ${thing}.`}
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => void takeOver()}
      >
        {pending ? "Taking over…" : "Take over"}
      </Button>
    </p>
  )
}
