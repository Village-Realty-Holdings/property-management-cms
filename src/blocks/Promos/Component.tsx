import React from 'react'
import { Tag } from 'lucide-react'

import type { PromosBlock as Props } from '@/payload-types'

import { Button } from '@/components/ui/button'
import { getPropertyProvider } from '@/server/properties'

const fmt = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export const PromosBlock: React.FC<Props & { disableInnerContainer?: boolean }> = async ({
  heading,
  nodeId,
  limit,
  ctaLabel,
  ctaPage,
}) => {
  const promos = await getPropertyProvider().listPromos({
    nodeId: nodeId || undefined,
    limit: limit ?? 3,
  })
  if (promos.length === 0) return null

  const page = typeof ctaPage === 'object' && ctaPage ? ctaPage : null
  const href = page?.slug ? (page.slug === 'home' ? '/' : `/${page.slug}`) : null

  return (
    <div className="container">
      {heading && <h2 className="mb-8 text-3xl font-semibold">{heading}</h2>}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {promos.map((promo) => (
          <article
            key={promo.id}
            className="flex flex-col gap-3 rounded border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-6"
          >
            <div className="flex items-center gap-2 text-2xl font-semibold">
              <Tag className="size-5" aria-hidden="true" />
              {promo.offer}
            </div>
            <h3 className="font-medium">{promo.name}</h3>
            <p className="text-sm text-muted-foreground">{promo.description}</p>
            <dl className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-2 text-xs text-muted-foreground">
              <div>
                <dt className="sr-only">Valid</dt>
                <dd>
                  {fmt(promo.startsAt)} – {fmt(promo.endsAt)}
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
                  <dd className="rounded bg-background px-1.5 py-0.5 font-mono">{promo.code}</dd>
                </div>
              )}
            </dl>
            {href && (
              <Button
                variant="outline"
                nativeButton={false}
                render={<a href={promo.code ? `${href}?promo=${promo.code}` : href} />}
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
