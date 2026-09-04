import React from 'react'

import type { NewsletterBlock as Props } from '@/payload-types'

import { cn } from '@/lib/ui'
import { NewsletterForm } from './Form.client'

export const NewsletterBlock: React.FC<Props & { disableInnerContainer?: boolean }> = ({
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
    typeof form === 'object' && form
      ? form.fields?.find((f) => f.blockType === 'email')
      : undefined
  const fieldName = emailField && 'name' in emailField ? emailField.name : 'email'

  return (
    <div className={cn(tone === 'band' ? 'bg-primary text-primary-foreground py-12' : 'container')}>
      <div
        className={cn(
          'container grid gap-6 md:grid-cols-2 md:items-center',
          tone !== 'band' && 'rounded border border-border bg-card p-8',
        )}
      >
        <div>
          {heading && <h2 className="text-2xl font-semibold md:text-3xl">{heading}</h2>}
          {text && <p className={cn('mt-2', tone === 'band' ? 'opacity-90' : 'text-muted-foreground')}>{text}</p>}
        </div>
        <NewsletterForm
          formId={String(formId)}
          fieldName={fieldName}
          buttonLabel={buttonLabel || 'Subscribe'}
          successMessage={successMessage || 'Thanks!'}
          inverted={tone === 'band'}
        />
      </div>
    </div>
  )
}
