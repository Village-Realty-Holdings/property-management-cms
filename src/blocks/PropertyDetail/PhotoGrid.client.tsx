'use client'

import React, { useState } from 'react'

import type { PropertyPhoto } from '@/server/properties/types'

import { cn } from '@/lib/ui'

/* eslint-disable @next/next/no-img-element -- PMS photos are external, outside next/image's allowlist */
export const PhotoGrid: React.FC<{ photos: PropertyPhoto[]; name: string }> = ({ photos, name }) => {
  const sorted = [...photos].sort((a, b) => a.order - b.order)
  const [active, setActive] = useState(0)
  const hero = sorted[active] ?? sorted[0]!

  return (
    <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
      <figure className="overflow-hidden rounded-xl bg-muted">
        <img src={hero.url} alt={hero.caption ?? name} className="aspect-[3/2] size-full object-cover" />
        {hero.caption && <figcaption className="px-1 py-2 text-sm text-muted-foreground">{hero.caption}</figcaption>}
      </figure>
      <ul className="grid grid-cols-3 gap-3 md:grid-cols-2">
        {sorted.slice(0, 6).map((photo, i) => (
          <li key={photo.url}>
            <button
              type="button"
              onClick={() => setActive(i)}
              aria-label={photo.caption ? `Show ${photo.caption}` : `Show photo ${i + 1}`}
              aria-pressed={i === active}
              className={cn(
                'block aspect-[3/2] w-full overflow-hidden rounded-lg bg-muted ring-2 ring-offset-2 ring-offset-background transition-[ring-color]',
                i === active ? 'ring-primary' : 'ring-transparent hover:ring-border',
              )}
            >
              <img src={photo.url} alt="" loading="lazy" className="size-full object-cover" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
