import React from 'react'
import {
  CalendarDays,
  Check,
  CreditCard,
  Home,
  KeyRound,
  Phone,
  Search,
  Sun,
  type LucideIcon,
} from 'lucide-react'

import type { BookingStepsBlock as Props } from '@/payload-types'

import { SectionHeader } from '@/components/SectionHeader'

const icons: Record<string, LucideIcon> = {
  search: Search,
  calendar: CalendarDays,
  card: CreditCard,
  key: KeyRound,
  home: Home,
  sun: Sun,
  phone: Phone,
  check: Check,
}

/** The steps really are a sequence, so they are numbered and joined by a line. */
export const BookingStepsBlock: React.FC<Props> = ({ heading, intro, steps }) => {
  if (!steps?.length) return null
  return (
    <div className="container">
      <SectionHeader heading={heading} intro={intro} />
      <ol className="grid gap-8 md:grid-cols-3 md:gap-6">
        {steps.map((step, i) => {
          const Icon = icons[step.icon ?? 'search'] ?? Search
          return (
            <li key={step.id ?? i} className="relative flex gap-4 md:flex-col md:gap-5">
              <div className="relative flex shrink-0 flex-col items-center md:w-full md:flex-row">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                {i < steps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="mt-2 w-px flex-1 bg-border md:mt-0 md:ml-3 md:h-px md:w-auto"
                  />
                )}
              </div>
              <div className="pb-2 md:pb-0">
                <p className="text-sm text-muted-foreground">Step {i + 1}</p>
                <h3 className="mt-1 text-subtitle">{step.title}</h3>
                <p className="mt-2 text-muted-foreground">{step.text}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
