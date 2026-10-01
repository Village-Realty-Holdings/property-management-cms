import { cn } from "@workspace/ui/lib/utils"

/** pclodge-landing's square, uppercase button, in the Site's accent colour. */
export function TuckInCta({
  href,
  label,
  className,
}: {
  href: string
  label: string
  className?: string
}) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center justify-center bg-(--brand-accent) px-6 py-3 text-base font-semibold text-(--brand-accent-foreground) uppercase transition-opacity hover:opacity-85 focus-visible:ring-3 focus-visible:ring-(--brand-accent)/50 focus-visible:ring-offset-2 focus-visible:outline-none",
        className
      )}
    >
      {label}
    </a>
  )
}

/** pclodge-landing's inline link style. */
export const tuckInLink =
  "text-primary underline underline-offset-4 hover:no-underline"
