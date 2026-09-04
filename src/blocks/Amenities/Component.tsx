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

import { SectionHeader } from '@/components/SectionHeader'
import { cn } from '@/lib/ui'

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

export const AmenitiesBlock: React.FC<AmenitiesBlockProps> = ({ heading, columns, items }) => {
  if (!items || items.length === 0) return null

  return (
    <div className="container">
      <SectionHeader heading={heading} />
      <ul className={cn('grid grid-cols-1 gap-4', columnClasses[columns ?? '3'])}>
        {items.map((item, index) => {
          const Icon = icons[item.icon ?? 'wifi'] ?? Wifi
          return (
            <li key={item.id ?? index} className="surface flex items-start gap-4 p-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="font-medium">{item.label}</p>
                {item.note && <p className="mt-0.5 text-sm text-muted-foreground">{item.note}</p>}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
