import Link from "next/link"
import { CompassIcon } from "lucide-react"

import { buttonVariants } from "@workspace/ui/components/button"

import { EmptyState } from "@workspace/site-views/site/empty-state"
import { SiteFrame } from "@/components/site-frame"

/** Rendered by the root layout, so it brings the Site's chrome itself. */
export default function NotFound() {
  return (
    <SiteFrame>
      <div className="mx-auto flex max-w-3xl flex-col px-4 py-20 sm:px-6 sm:py-28">
        <EmptyState
          icon={CompassIcon}
          title="We couldn't find that page"
          description="It may have moved, or the link may be mistyped. Start again from the home page."
          action={
            <Link href="/" className={buttonVariants({ size: "lg" })}>
              Go to the home page
            </Link>
          }
        />
      </div>
    </SiteFrame>
  )
}
