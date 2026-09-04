import React from 'react'
import { Check } from 'lucide-react'

import type { PricingBlock as PricingBlockProps } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { SectionHeader } from '@/components/SectionHeader'
import { cn } from '@/lib/ui'

const periodSuffix: Record<string, string> = {
  night: '/ night',
  week: '/ week',
  month: '/ month',
  year: '/ year',
  once: '',
}

export const PricingBlock: React.FC<PricingBlockProps> = ({ heading, currency, plans, footnote }) => {
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 0,
  })

  const count = plans?.length ?? 0

  return (
    <div className="container">
      <SectionHeader heading={heading} />

      <div
        className={cn('grid gap-5 sm:grid-cols-2 md:gap-6', {
          'lg:grid-cols-3': count === 3,
          'lg:grid-cols-4': count >= 4,
        })}
      >
        {(plans || []).map((plan, i) => {
          const { name, price, period, description, features, highlighted, enableLink, link } = plan
          const suffix = periodSuffix[period || 'month']

          return (
            <article
              key={plan.id || i}
              className={cn('surface flex flex-col gap-6 p-6 md:p-8', highlighted && 'border-primary ring-1 ring-primary')}
            >
              <div>
                <h3 className="text-lg">{name}</h3>
                <p className="mt-3">
                  <span className="text-title font-semibold">{formatter.format(price ?? 0)}</span>
                  {suffix && <span className="ml-1.5 text-muted-foreground">{suffix}</span>}
                </p>
                {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
              </div>

              {features && features.length > 0 && (
                <ul className="flex flex-col gap-2.5 text-sm">
                  {features.map((feature, j) => (
                    <li key={feature.id || j} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span>{feature.text}</span>
                    </li>
                  ))}
                </ul>
              )}

              {enableLink && link && (
                <div className="mt-auto pt-2">
                  <CMSLink {...link} className="w-full" appearance={highlighted ? 'default' : 'outline'} />
                </div>
              )}
            </article>
          )
        })}
      </div>

      {footnote && <p className="mt-6 text-sm text-muted-foreground">{footnote}</p>}
    </div>
  )
}
