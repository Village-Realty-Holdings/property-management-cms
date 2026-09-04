import React from 'react'
import Link from 'next/link'
import { Tag } from 'lucide-react'

import type { PromosBlock as Props } from '@/payload-types'

import { SectionHeader } from '@/components/SectionHeader'
import { Button } from '@/components/ui/button'
import { getPropertyProvider } from '@/server/properties'
import { pagePath } from '@/lib/pagePath'

const fmt = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export const PromosBlock: React.FC<Props> = async ({ heading, nodeId, limit, ctaLabel, ctaPage }) => {
  const promos = await getPropertyProvider().listPromos({
    nodeId: nodeId || undefined,
    limit: limit ?? 3,
  })
  if (promos.length === 0) return null

  const href = pagePath(ctaPage)

  return (
    <div className="container">
      <SectionHeader heading={heading} />
      <div className="grid gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {promos.map((promo) => (
          <article key={promo.id} className="surface flex flex-col gap-3 border-primary/25 bg-accent/40 p-6">
            <p className="flex items-center gap-2 text-subtitle font-semibold text-primary">
              <Tag className="size-5" aria-hidden="true" />
              {promo.offer}
            </p>
            <h3 className="text-lg">{promo.name}</h3>
            <p className="text-sm text-muted-foreground">{promo.description}</p>
            <dl className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-2 text-sm text-muted-foreground">
              <div>
                <dt className="sr-only">Valid</dt>
                <dd>
                  {fmt(promo.startsAt)} to {fmt(promo.endsAt)}
                </dd>
              </div>
              {promo.minNights && (
                <div>
                  <dt className="sr-only">Minimum</dt>
                  <dd>{promo.minNights}+ nights</dd>
                </div>
              )}
              {promo.code && (
                <div>
                  <dt className="sr-only">Code</dt>
                  <dd className="rounded-sm bg-background px-1.5 py-0.5 font-mono text-xs">{promo.code}</dd>
                </div>
              )}
            </dl>
            {href && (
              <Button
                variant="outline"
                className="mt-2"
                nativeButton={false}
                render={<Link href={promo.code ? `${href}?promo=${promo.code}` : href} />}
              >
                {ctaLabel || 'Book now'}
              </Button>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}
