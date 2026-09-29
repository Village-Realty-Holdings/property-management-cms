import { Breadcrumbs } from "@workspace/site-views/site/breadcrumbs"
import { displayFont } from "@workspace/site-views/site/display"

/** The /rentals title block; static, so it renders before the results. */
export function RentalsHeader() {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-8">
      <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Rentals" }]}
      />
      <h1
        className={`${displayFont} text-5xl leading-[0.95] text-balance sm:text-6xl`}
      >
        Places to stay
      </h1>
      <p className="max-w-2xl text-base text-pretty text-muted-foreground sm:text-lg">
        Every home we look after, in one place. Narrow it down by where you want
        to be, who&rsquo;s coming and what you can&rsquo;t do without.
      </p>
    </header>
  )
}
