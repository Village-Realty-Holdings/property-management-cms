'use client'

import React, { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getClientSideURL } from '@/lib/getURL'
import { cn } from '@/lib/ui'

type Props = {
  formId: string
  fieldName: string
  buttonLabel: string
  successMessage: string
  inverted?: boolean
}

export const NewsletterForm: React.FC<Props> = ({
  formId,
  fieldName,
  buttonLabel,
  successMessage,
  inverted,
}) => {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const email = new FormData(e.currentTarget).get('email')
    setState('sending')
    try {
      const res = await fetch(`${getClientSideURL()}/api/form-submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form: formId,
          submissionData: [{ field: fieldName, value: String(email ?? '') }],
        }),
      })
      setState(res.ok ? 'done' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <p className="text-lead font-medium" role="status">
        {successMessage}
      </p>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
      <label className="sr-only" htmlFor="newsletter-email">
        Email address
      </label>
      <Input
        id="newsletter-email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="Your email"
        className={cn('h-12 flex-1 text-base', inverted && 'border-transparent bg-background text-foreground')}
      />
      <Button type="submit" size="lg" variant={inverted ? 'inverse' : 'default'} disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending…' : buttonLabel}
      </Button>
      {state === 'error' && (
        <p className="text-sm sm:basis-full" role="alert">
          We couldn&apos;t save your email. Please try again.
        </p>
      )}
    </form>
  )
}
