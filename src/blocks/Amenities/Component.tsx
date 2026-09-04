import React from 'react'
import {
  ArrowUpDown,
  Beef,
  Building2,
  Car,
  CookingPot,
  Dumbbell,
  Flame,
  PawPrint,
  ShieldCheck,
  Snowflake,
  TreePine,
  Tv,
  Umbrella,
  WashingMachine,
  Waves,
  Wifi,
  type LucideIcon,
} from 'lucide-react'

import type { AmenitiesBlock as AmenitiesBlockProps } from '@/payload-types'

import { cn } from '@/lib/ui'

type Props = AmenitiesBlockProps & { disableInnerContainer?: boolean }

const icons: Record<string, LucideIcon> = {
  wifi: Wifi,
  parking: Car,
  pool: Waves,
  gym: Dumbbell,
  kitchen: CookingPot,
  laundry: WashingMachine,
  airConditioning: Snowflake,
  heating: Flame,
  petFriendly: PawPrint,
  tv: Tv,
  elevator: ArrowUpDown,
  balcony: Building2,
  security: ShieldCheck,
  garden: TreePine,
  bbq: Beef,
  beach: Umbrella,
}

const columnClasses: Record<string, string> = {
  '2': 'md:grid-cols-2',
  '3': 'md:grid-cols-2 lg:grid-cols-3',
  '4': 'md:grid-cols-2 lg:grid-cols-4',
}

export const AmenitiesBlock: React.FC<Props> = ({ heading, columns, items }) => {
  if (!items || items.length === 0) return null

  return (
    <div className="container my-16">
      {heading && <h2 className="mb-8 text-3xl font-semibold">{heading}</h2>}
      <ul className={cn('grid grid-cols-1 gap-4', columnClasses[columns ?? '3'])}>
        {items.map((item, index) => {
          const Icon = icons[item.icon ?? 'wifi'] ?? Wifi
          return (
            <li
              key={item.id ?? index}
              className="flex items-start gap-3 rounded border border-border bg-card p-4"
            >
              <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <div className="font-medium">{item.label}</div>
                {item.note && <div className="text-sm text-muted-foreground">{item.note}</div>}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
