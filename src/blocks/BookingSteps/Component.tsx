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

export const BookingStepsBlock: React.FC<Props & { disableInnerContainer?: boolean }> = ({
  heading,
  intro,
  steps,
}) => {
  if (!steps?.length) return null
  return (
    <div className="container">
      {(heading || intro) && (
        <header className="mb-10 max-w-[40rem] text-center mx-auto">
          {heading && <h2 className="text-3xl font-semibold">{heading}</h2>}
          {intro && <p className="mt-2 text-muted-foreground">{intro}</p>}
        </header>
      )}
      <ol className="grid gap-8 md:grid-cols-3">
        {steps.map((step, i) => {
          const Icon = icons[step.icon ?? 'search'] ?? Search
          return (
            <li key={step.id ?? i} className="relative flex flex-col items-center text-center">
              <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Icon className="size-6" aria-hidden="true" />
              </div>
              <span className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Step {i + 1}
              </span>
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
