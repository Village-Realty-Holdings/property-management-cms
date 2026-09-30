import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

import { blockGroups, catalogueEntries } from "@/blocks/catalogue"
import { siteSchema } from "@/database"
import { Block } from "@/site/blocks"
import { samples } from "@/site/blocks/samples"
import { container } from "@/site/blocks/types"
import { devOnly } from "@/site/dev/devOnly"
import { displayFont } from "@/site/display"
import { fixturesFor } from "@/site/fixtures"

export const metadata: Metadata = {
  title: "Block catalogue",
  robots: { index: false, follow: false },
}

/**
 * The Block catalogue, outside production only (404 in production). The
 * list is the Block picker's: each Block with its thumbnail, linking to its
 * own page (/dev/blocks/<slug>, with `?background=`, `?variant=`,
 * `?fixtures=` and sample-field overrides). Below it, every Block rendered
 * from its sample, the same component a published Page uses.
 */
export default function BlockCataloguePage() {
  devOnly()
  const fixtures = fixturesFor(siteSchema())
  return (
    <>
      <div className={`${container} py-12`}>
        <h1 className={`${displayFont} text-4xl`}>Block catalogue</h1>
        {blockGroups.map((group) => {
          const entries = catalogueEntries.filter((e) => e.group === group)
          if (entries.length === 0) return null
          return (
            <div key={group} className="mt-8">
              <h2 className="text-xl font-semibold">{group}</h2>
              <ul className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {entries.map((entry) => (
                  <li key={entry.slug} className="flex flex-col gap-2">
                    <Image
                      src={entry.thumbnail}
                      alt=""
                      width={160}
                      height={100}
                      className="h-auto w-40 rounded-(--card-radius) border border-border"
                    />
                    <Link
                      href={`/dev/blocks/${entry.slug}`}
                      className="font-medium text-link underline underline-offset-4"
                    >
                      {entry.label}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {entry.description}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
      {/* Positions start at 1, so the catalogue's own heading stays the h1. */}
      {catalogueEntries.map((entry, i) => (
        <Block
          key={entry.slug}
          block={samples[entry.blockType]}
          index={i + 1}
          fixtures={fixtures}
        />
      ))}
    </>
  )
}
