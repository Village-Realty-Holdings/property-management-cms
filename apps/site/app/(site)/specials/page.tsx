import type { Metadata } from "next"
import Link from "next/link"
import { TicketPercentIcon } from "lucide-react"

import { getSiteSettings } from "@workspace/content"
import { buttonVariants } from "@workspace/ui/components/button"

import { SpecialCard } from "@workspace/site-views/editorial/special-card"
import { currentSpecials } from "@/lib/specials"
import { Breadcrumbs } from "@workspace/site-views/site/breadcrumbs"
import { EmptyState } from "@workspace/site-views/site/empty-state"
import { SectionHeading } from "@workspace/site-views/site/section-heading"
import { hasSite, requireSiteEnv } from "@/lib/site"

export async function generateMetadata(): Promise<Metadata> {
  if (!hasSite()) return { title: "Specials" }
  const { name } = await getSiteSettings()
  return {
    title: "Specials",
    description: `Current offers and discount codes for stays with ${name}.`,
  }
}

export default async function SpecialsPage() {
  await requireSiteEnv()
  const current = await currentSpecials()

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <header className="flex flex-col gap-6">
        <Breadcrumbs
          items={[{ label: "Home", href: "/" }, { label: "Specials" }]}
        />
        <SectionHeading
          as="h1"
          title="Specials"
          description="Current offers on our rentals. Quote the code when you book."
        />
      </header>
      {current.length === 0 ? (
        <EmptyState
          icon={TicketPercentIcon}
          title="No current specials"
          description="Check back soon. New offers go up here first."
          action={
            <Link href="/rentals" className={buttonVariants({ size: "lg" })}>
              Browse rentals
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-6">
          {current.map((special) => (
            <li key={special.id}>
              <SpecialCard special={special} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
