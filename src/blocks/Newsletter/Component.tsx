import React from 'react'

import type { NewsletterBlock as Props } from '@/payload-types'

import { cn } from '@/lib/ui'
import { NewsletterForm } from './Form.client'

export const NewsletterBlock: React.FC<Props> = ({
  heading,
  text,
  form,
  buttonLabel,
  successMessage,
  tone,
}) => {
  const formId = typeof form === 'object' && form ? form.id : form
  if (!formId) return null
  const emailField =
    typeof form === 'object' && form ? form.fields?.find((f) => f.blockType === 'email') : undefined
  const fieldName = emailField && 'name' in emailField ? emailField.name : 'email'
  const band = tone === 'band'

  return (
    <div className={cn(band && 'bg-primary py-14 text-primary-foreground md:py-20')}>
      <div className="container">
        <div
          className={cn(
            'grid gap-6 md:grid-cols-2 md:items-center md:gap-12',
            !band && 'surface p-8 md:p-10',
          )}
        >
          <div>
            {heading && <h2 className="text-title">{heading}</h2>}
            {text && (
              <p className={cn('mt-3 text-lead', band ? 'text-primary-foreground/85' : 'text-muted-foreground')}>
                {text}
              </p>
            )}
          </div>
          <NewsletterForm
            formId={String(formId)}
            fieldName={fieldName}
            buttonLabel={buttonLabel || 'Subscribe'}
            successMessage={successMessage || 'Thanks! Check your inbox to confirm.'}
            inverted={band}
          />
        </div>
      </div>
    </div>
  )
}
