"use client"

import { useId } from "react"

import {
  RadioGroup,
  RadioGroupButton,
} from "@workspace/ui/components/radio-group"
import { cn } from "@workspace/ui/lib/utils"

type Choice<V extends string> = {
  readonly value: V
  readonly label: string
  readonly hint?: string
}

/**
 * A pick from a short list, as a radio group drawn as buttons. Pressing the choice in use
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
      <RadioGroup
        aria-labelledby={id}
        aria-describedby={description ? `${id}-description` : undefined}
        className="flex w-auto flex-row flex-wrap gap-1"
        value={value}
        onValueChange={(next) => {
          if (next !== value) onChange(next as V)
        }}
      >
        {options.map((option) => (
          <RadioGroupButton key={option.value} value={option.value}>
            {option.label}
          </RadioGroupButton>
        ))}
      </RadioGroup>
      {description && (
        <p id={`${id}-description`} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  )
}
