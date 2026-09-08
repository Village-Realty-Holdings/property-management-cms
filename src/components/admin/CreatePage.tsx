'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

/**
 * Stands in for Payload's create form. It creates a draft page straight away
 * (title "New page", the layout's default hero) through the REST API as the
 * logged-in user, then opens the visual editor for it. Naming the page and
 * setting its slug happen in the editor's page settings.
 *
 * The slug field is unique, so a second "New page" gets a number appended.
 */
export function CreatePage({ adminRoute }: { adminRoute: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    let cancelled = false
    createDraft()
      .then((id) => {
        if (!cancelled) router.replace(`${adminRoute}/collections/pages/${id}`)
      })
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [adminRoute, router])

  return (
    <div style={{ padding: 'var(--base)' }}>
      {error ? (
        <>
          <p style={{ color: 'var(--theme-error-500)' }}>Could not create the page: {error}</p>
          <p>
            <a href={`${adminRoute}/collections/pages`}>Back to pages</a>
          </p>
        </>
      ) : (
        <p>Setting up your new page…</p>
      )}
    </div>
  )
}

const MAX_TRIES = 25

async function createDraft(): Promise<number | string> {
  let lastError = 'Save failed'
  for (let n = 1; n <= MAX_TRIES; n++) {
    const title = n === 1 ? 'New page' : `New page ${n}`
    const res = await fetch('/api/pages?draft=true&depth=0', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, _status: 'draft' }),
    })
    if (res.ok) {
      const json = (await res.json()) as { doc: { id: number | string } }
      return json.doc.id
    }
    lastError = await describeError(res)
    if (!/slug|unique|already/i.test(lastError)) break
  }
  throw new Error(lastError)
}

async function describeError(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as {
      errors?: { message?: string; data?: { errors?: { message?: string; path?: string }[] } }[]
    }
    const first = json.errors?.[0]
    const field = first?.data?.errors?.[0]
    if (field?.message) return field.path ? `${field.path}: ${field.message}` : field.message
    if (first?.message) return first.message
  } catch {
    /* not JSON */
  }
  return res.status === 403 ? 'You do not have permission to create pages.' : `Save failed (${res.status})`
}
