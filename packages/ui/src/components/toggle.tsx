"use client"

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const toggleVariants = cva(
  "group/toggle inline-flex items-center justify-center gap-1 rounded-(--btn-radius) text-sm font-(weight:--btn-weight) tracking-(--btn-tracking) whitespace-nowrap [text-transform:var(--btn-transform)] transition-all duration-(--duration) outline-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-pressed:bg-muted data-[state=on]:bg-muted motion-reduce:transition-none dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-input bg-transparent hover:bg-muted",
      },
      size: {
        default:
          "h-(--btn-height) min-w-(--btn-height) px-(--btn-px) has-data-[icon=inline-end]:pr-[calc(var(--btn-px)*0.8)] has-data-[icon=inline-start]:pl-[calc(var(--btn-px)*0.8)]",
        sm: "h-[calc(var(--btn-height)*0.875)] min-w-[calc(var(--btn-height)*0.875)] rounded-[calc(var(--btn-radius)*0.8)] px-(--btn-px) text-[0.8rem] has-data-[icon=inline-end]:pr-[calc(var(--btn-px)*0.6)] has-data-[icon=inline-start]:pl-[calc(var(--btn-px)*0.6)] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-[calc(var(--btn-height)*1.125)] min-w-[calc(var(--btn-height)*1.125)] px-(--btn-px) has-data-[icon=inline-end]:pr-[calc(var(--btn-px)*0.8)] has-data-[icon=inline-start]:pl-[calc(var(--btn-px)*0.8)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
