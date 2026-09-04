import React from 'react'
import { Check } from 'lucide-react'

import type { PricingBlock as PricingBlockProps } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/ui'

type Props = PricingBlockProps & { disableInnerContainer?: boolean }

const periodSuffix: Record<string, string> = {
  night: '/ night',
  week: '/ week',
  month: '/ month',
  year: '/ year',
  once: '',
}

export const PricingBlock: React.FC<Props> = ({ heading, currency, plans, footnote }) => {
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 0,
  })

  const count = plans?.length ?? 0

  return (
    <div className="container">
      {heading && <h2 className="mb-8 text-3xl font-semibold">{heading}</h2>}

      <div
        className={cn('grid gap-6 sm:grid-cols-2', {
          'lg:grid-cols-3': count === 3,
          'lg:grid-cols-4': count >= 4,
        })}
      >
        {(plans || []).map((plan, i) => {
          const { name, price, period, description, features, highlighted, enableLink, link } = plan
          const suffix = periodSuffix[period || 'month']

          return (
            <Card key={plan.id || i} className={cn({ 'ring-2 ring-primary': highlighted })}>
              <CardHeader>
                <CardTitle>{name}</CardTitle>
                <p className="mt-2">
                  <span className="text-3xl font-semibold">{formatter.format(price ?? 0)}</span>
                  {suffix && <span className="ml-1 text-muted-foreground">{suffix}</span>}
                </p>
                {description && <p className="text-muted-foreground">{description}</p>}
              </CardHeader>

              {features && features.length > 0 && (
                <CardContent>
                  <ul className="flex flex-col gap-2">
                    {features.map((feature, j) => (
                      <li key={feature.id || j} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                        <span>{feature.text}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              )}

              {enableLink && link && (
                <CardFooter className="mt-auto">
                  <CMSLink {...link} className="w-full" />
                </CardFooter>
              )}
            </Card>
          )
        })}
      </div>

      {footnote && <p className="mt-6 text-sm text-muted-foreground">{footnote}</p>}
    </div>
  )
}
