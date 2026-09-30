"use client"

import { Radio as RadioPrimitive } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"
import { cn } from "cn"

import { toggleVariants } from "@workspace/ui/components/toggle"

function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("grid w-full gap-2", className)}
      {...props}
    />
  )
}

function RadioGroupItem({ className, ...props }: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(
        "group/radio-group-item peer relative flex aspect-square size-4 shrink-0 rounded-full border border-input outline-none group-has-[:focus-visible]/field-label:ring-0 group-has-[:focus-visible]/field-label:not-data-checked:border-input after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground group-has-[:focus-visible]/field-label:data-checked:border-primary dark:data-checked:bg-primary",
        className
      )}
      {...props}
    >
      <RadioPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="flex size-4 items-center justify-center"
      >
        <span className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground" />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  )
}

/**
 * A choice in a RadioGroup drawn as a button, like a toggle: for a short
 * pick-one list (a Theme control) whose options are words, not circles. It is
 * still a radio to assistive technology, so the arrow keys move between the
 * choices and the group reads as "one of".
 */
function RadioGroupButton({
  className,
  ...props
}: Omit<RadioPrimitive.Root.Props, "render" | "nativeButton">) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-button"
      render={<button type="button" />}
      nativeButton
      className={cn(
        toggleVariants({ variant: "outline", size: "sm" }),
        "shrink-0 focus:z-10 focus-visible:z-10 aria-checked:bg-muted",
        className
      )}
      {...props}
    />
  )
}

export { RadioGroup, RadioGroupItem, RadioGroupButton }
