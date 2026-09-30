import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// Everything about a button's look (corners, height, padding, weight, case,
// tracking, shadow, lift) is read from the --btn-* tokens in globals.css.
// Smaller and larger sizes scale from --btn-height and --btn-px.
const solid =
  "shadow-(--btn-shadow) hover:-translate-y-(--btn-lift) motion-reduce:hover:translate-y-0"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-(--btn-radius) border border-transparent bg-clip-padding text-sm font-(weight:--btn-weight) tracking-(--btn-tracking) whitespace-nowrap [text-transform:var(--btn-transform)] transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 motion-reduce:transition-none dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: `bg-primary text-primary-foreground hover:bg-[color-mix(in_srgb,var(--primary)_80%,var(--background))] ${solid}`,
        // The accent colour: the Site's second brand colour (a Theme input).
        accent: `bg-accent text-accent-foreground hover:bg-[color-mix(in_srgb,var(--accent)_80%,var(--background))] ${solid}`,
        outline: `border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50 ${solid}`,
        secondary: `bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground ${solid}`,
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive: `bg-destructive/10 text-destructive-text hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40 ${solid}`,
        link: "text-link underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-(--btn-height) gap-1.5 px-(--btn-px) has-data-[icon=inline-end]:pr-[calc(var(--btn-px)*0.8)] has-data-[icon=inline-start]:pl-[calc(var(--btn-px)*0.8)]",
        xs: "h-[calc(var(--btn-height)*0.75)] gap-1 rounded-[calc(var(--btn-radius)*0.8)] px-[calc(var(--btn-px)*0.8)] text-xs in-data-[slot=button-group]:rounded-(--btn-radius) has-data-[icon=inline-end]:pr-[calc(var(--btn-px)*0.6)] has-data-[icon=inline-start]:pl-[calc(var(--btn-px)*0.6)] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-[calc(var(--btn-height)*0.875)] gap-1 rounded-[calc(var(--btn-radius)*0.8)] px-(--btn-px) text-[0.8rem] in-data-[slot=button-group]:rounded-(--btn-radius) has-data-[icon=inline-end]:pr-[calc(var(--btn-px)*0.6)] has-data-[icon=inline-start]:pl-[calc(var(--btn-px)*0.6)] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-[calc(var(--btn-height)*1.125)] gap-1.5 px-(--btn-px) has-data-[icon=inline-end]:pr-[calc(var(--btn-px)*0.8)] has-data-[icon=inline-start]:pl-[calc(var(--btn-px)*0.8)]",
        icon: "size-(--btn-height)",
        "icon-xs":
          "size-[calc(var(--btn-height)*0.75)] rounded-[calc(var(--btn-radius)*0.8)] in-data-[slot=button-group]:rounded-(--btn-radius) [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-[calc(var(--btn-height)*0.875)] rounded-[calc(var(--btn-radius)*0.8)] in-data-[slot=button-group]:rounded-(--btn-radius)",
        "icon-lg": "size-[calc(var(--btn-height)*1.125)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
