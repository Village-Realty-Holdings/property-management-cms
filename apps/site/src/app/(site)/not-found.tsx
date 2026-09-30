import Link from "next/link"

import { cn } from "@workspace/ui/lib/utils"

import { displayFont } from "@/site/display"

export default function NotFound() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 px-4 py-24 sm:px-6">
      <h1 className={cn(displayFont, "text-4xl")}>Page not found</h1>
      <p className="text-muted-foreground">
        There&apos;s no page at this address. It may have moved or been
        unpublished.
      </p>
      <Link
        href="/"
        className="font-medium text-link underline underline-offset-4"
      >
        Go to the home page
      </Link>
    </section>
  )
}
