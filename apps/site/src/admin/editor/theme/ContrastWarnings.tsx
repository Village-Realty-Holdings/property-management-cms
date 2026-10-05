"use client"

import { useId } from "react"
import { TriangleAlertIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import {
  applyFix,
  contrastWarnings,
  INPUT_LABELS,
  type ThemeInputs,
} from "../../../theme"

/**
 * The colours a User set that are hard to read, each with a one-click
 * fix. A warning never blocks saving. Shows nothing when there is none.
 */
export function ContrastWarnings({
  value,
  onChange,
}: {
  value: ThemeInputs
  onChange: (next: ThemeInputs) => void
}) {
  const headingId = useId()
  const warnings = contrastWarnings(value)
  if (warnings.length === 0) return null

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-950"
    >
      <h3
        id={headingId}
        className="flex items-center gap-2 text-sm font-medium"
      >
        <TriangleAlertIcon className="size-4" aria-hidden="true" />
        Contrast warnings
      </h3>
      <ul className="flex flex-col gap-2">
        {warnings.map((warning) => (
          <li
            key={warning.id}
            className="flex flex-col items-start gap-1.5 text-xs"
          >
            <span>
              {warning.message}{" "}
              <span className="whitespace-nowrap">
                ({warning.ratio.toFixed(1)}:1, needs {warning.needed}:1)
              </span>
            </span>
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => onChange(applyFix(value, warning.fix))}
            >
              {warning.fix.field !== "buttonText" && (
                <span
                  aria-hidden="true"
                  className="size-3 rounded-sm border"
                  style={{ background: warning.fix.value }}
                />
              )}
              Apply fix
              <span className="sr-only"> to {INPUT_LABELS[warning.field]}</span>
              <span aria-hidden="true" className="font-mono">
                {warning.fix.field === "buttonText"
                  ? "Automatic"
                  : warning.fix.value}
              </span>
            </Button>
          </li>
        ))}
      </ul>
      <p className="text-xs">You can still save.</p>
    </section>
  )
}
