"use client"

import { useEffect, useRef, useState } from "react"
import { CheckIcon, CopyIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

type Status = "idle" | "copied" | "failed"

export type CopyCodeButtonProps = {
  code: string
  className?: string
}

/**
 * Copies a Special's code to the clipboard and says so (politely, for screen
 * readers). Where the clipboard is blocked it asks the guest to copy by hand;
 * the code is always shown as text beside it.
 */
export function CopyCodeButton({ code, className }: CopyCodeButtonProps) {
  const [status, setStatus] = useState<Status>("idle")
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  async function copy() {
    clearTimeout(timer.current)
    try {
      await navigator.clipboard.writeText(code)
      setStatus("copied")
    } catch {
      setStatus("failed")
    }
    timer.current = setTimeout(() => setStatus("idle"), 2500)
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className={cn(
          "inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-(--brand-accent) px-4 text-sm font-semibold text-(--brand-accent-foreground) transition-transform hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-(--brand-accent)/50 focus-visible:ring-offset-2 focus-visible:ring-offset-(--brand-primary) focus-visible:outline-none motion-reduce:transition-none",
          className
        )}
      >
        {status === "copied" ? (
          <CheckIcon aria-hidden className="size-4" />
        ) : (
          <CopyIcon aria-hidden className="size-4" />
        )}
        {status === "copied" ? "Copied" : "Copy code"}
        <span className="sr-only"> {code}</span>
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {status === "copied" && `Code ${code} copied to the clipboard.`}
        {status === "failed" &&
          `Couldn't copy automatically. The code is ${code}.`}
      </span>
      {status === "failed" && (
        <span aria-hidden className="text-sm opacity-80">
          Select the code to copy it.
        </span>
      )}
    </>
  )
}
