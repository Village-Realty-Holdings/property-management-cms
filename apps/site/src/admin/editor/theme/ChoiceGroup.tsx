"use client"

import { useId } from "react"

import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import { cn } from "@workspace/ui/lib/utils"

type Choice<V extends string> = {
  readonly value: V
  readonly label: string
  readonly hint?: string
}

/**
 * A pick from a short list, as a toggle group. Pressing the choice in use
 * does nothing: a Theme control always has a value. The help, and the chosen
 * option's hint, show under the group.
 */
export function ChoiceGroup<V extends string>({
  label,
  hideLabel,
  help,
  options,
  value,
  onChange,
}: {
  label: string
  /** Keep the label for assistive technology only, where a heading says it. */
  hideLabel?: boolean
  help?: string
  options: readonly Choice<V>[]
  value: V
  onChange: (value: V) => void
}) {
  const id = useId()
  const hint = options.find((option) => option.value === value)?.hint
  const description = [help, hint].filter(Boolean).join(" ")

  return (
    <div className="flex flex-col gap-1.5">
      <span
        id={id}
        className={cn("text-sm font-medium", hideLabel && "sr-only")}
      >
        {label}
      </span>
      <ToggleGroup
        aria-labelledby={id}
        aria-describedby={description ? `${id}-description` : undefined}
        variant="outline"
        size="sm"
        spacing={1}
        className="flex-wrap"
        value={[value]}
        onValueChange={(next) => {
          const chosen = next[0] as V | undefined
          if (chosen !== undefined && chosen !== value) onChange(chosen)
        }}
      >
        {options.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {description && (
        <p id={`${id}-description`} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  )
}
