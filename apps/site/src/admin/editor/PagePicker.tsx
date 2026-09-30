"use client"

import { Button } from "@workspace/ui/components/button"

/**
 * STUB. The Ctrl-K Page picker (a command dialog that searches Pages by title
 * and path) replaces this in its own slice. Until then it is the button that
 * will open it, switched off.
 */
export function PagePicker() {
  return (
    <Button variant="outline" size="sm" disabled>
      Pages{" "}
      <kbd className="rounded border border-border px-1 font-mono text-xs">
        Ctrl K
      </kbd>
    </Button>
  )
}
