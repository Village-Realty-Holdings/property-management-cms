import React from 'react'
import { MapPin } from 'lucide-react'

import type { LocationBlock as LocationBlockProps } from '@/payload-types'

import RichText from '@/components/RichText'

type Props = LocationBlockProps & { disableInnerContainer?: boolean }

export const LocationBlock: React.FC<Props> = (props) => {
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
    <div className="container my-16">
      {heading && <h2 className="mb-8 text-3xl font-semibold">{heading}</h2>}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="space-y-6">
          {addressLines.length > 0 && (
            <address className="not-italic">
              {addressLines.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
              {directionsHref && (
                <a
                  href={directionsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm underline"
                >
                  Get directions
                </a>
              )}
            </address>
          )}

          {nearby && nearby.length > 0 && (
            <ul className="space-y-2">
              {nearby.map((place, index) => (
                <li key={place.id ?? index} className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>
                    {place.name}
                    {place.distance && (
                      <span className="text-muted-foreground"> · {place.distance}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {notes && <RichText data={notes} enableGutter={false} />}
        </div>

        {embedSrc && mapHref && (
          <div>
            <iframe
              src={embedSrc}
              title={`Map of ${formattedAddress || 'the property'}`}
              loading="lazy"
              className="w-full aspect-[4/3] rounded border border-border"
            />
            <a
              href={mapHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm text-muted-foreground underline"
            >
              Open in maps
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
