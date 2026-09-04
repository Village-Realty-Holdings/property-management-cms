import React from 'react'
import { ArrowUpRight, MapPin } from 'lucide-react'

import type { LocationBlock as LocationBlockProps } from '@/payload-types'

import RichText from '@/components/RichText'
import { SectionHeader } from '@/components/SectionHeader'

const linkClass =
  'inline-flex w-fit items-center gap-1 rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline'

export const LocationBlock: React.FC<LocationBlockProps> = (props) => {
  const { heading, address, latitude, longitude, zoom, showMap, nearby, notes } = props

  const addressLines = [
    address?.street,
    [address?.city, address?.region, address?.postalCode].filter(Boolean).join(', '),
    address?.country,
  ].filter((line): line is string => Boolean(line && line.trim()))

  const formattedAddress = addressLines.join(', ')
  const directionsHref = formattedAddress
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(formattedAddress)}`
    : null

  const lat = typeof latitude === 'number' ? latitude : null
  const lng = typeof longitude === 'number' ? longitude : null
  const z = Math.min(19, Math.max(1, zoom ?? 14))
  const hasMap = Boolean(showMap) && lat !== null && lng !== null

  let embedSrc: string | null = null
  let mapHref: string | null = null
  if (hasMap && lat !== null && lng !== null) {
    const d = 0.02 * Math.pow(2, 14 - z)
    embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik&marker=${lat},${lng}`
    mapHref = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${z}/${lat}/${lng}`
  }

  return (
    <div className="container">
      <SectionHeader heading={heading} />
      <div className="grid gap-8 md:grid-cols-[2fr_3fr] md:gap-12">
        <div className="flex flex-col gap-6">
          {addressLines.length > 0 && (
            <address className="flex flex-col gap-3 text-lead not-italic">
              <span>
                {addressLines.map((line, i) => (
                  <span key={i} className="block">
                    {line}
                  </span>
                ))}
              </span>
              {directionsHref && (
                <a href={directionsHref} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  Get directions
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </a>
              )}
            </address>
          )}

          {nearby && nearby.length > 0 && (
            <ul className="flex flex-col gap-2 text-sm">
              {nearby.map((place, index) => (
                <li key={place.id ?? index} className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span>
                    {place.name}
                    {place.distance && <span className="text-muted-foreground">, {place.distance}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {notes && (
            <div className="text-sm text-muted-foreground">
              <RichText data={notes} enableGutter={false} />
            </div>
          )}
        </div>

        {embedSrc && mapHref && (
          <div className="flex flex-col gap-2">
            <iframe
              src={embedSrc}
              title={`Map of ${heading || formattedAddress || 'the location'}`}
              loading="lazy"
              className="aspect-[4/3] w-full rounded-lg border border-border bg-muted"
            />
            <a href={mapHref} target="_blank" rel="noopener noreferrer" className={linkClass}>
              Open in maps
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
