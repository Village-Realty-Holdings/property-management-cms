'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

type Props = {
  adminRoute: string
  /**
   * An existing draft that has no title yet. With autosave on, Payload creates
   * an empty draft and redirects to it before this view can run, so the page
   * is named here instead of created.
   */
  docId?: number | string
}

/**
 * Stands in for Payload's create form. It gives the page a title ("New page",
 * numbered when the slug is taken) through the REST API as the logged-in
 * user, then opens the visual editor for it. Renaming and setting the slug
 * happen in the editor's page settings.
 */
export function CreatePage({ adminRoute, docId }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    let cancelled = false
    setUpPage(docId)
      .then((id) => {
        if (cancelled) return
        // Same URL: refresh re-runs the server view, which now sees a title and renders the editor.
        if (docId) router.refresh()
        else router.replace(`${adminRoute}/collections/pages/${id}`)
      })
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [adminRoute, docId, router])

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

/** Names the draft (creating it first when there is none) and returns its id. */
async function setUpPage(docId?: number | string): Promise<number | string> {
  let lastError = 'Save failed'
  for (let n = 1; n <= MAX_TRIES; n++) {
    const title = n === 1 ? 'New page' : `New page ${n}`
    const res = await fetch(docId ? `/api/pages/${docId}?draft=true&depth=0` : '/api/pages?draft=true&depth=0', {
      method: docId ? 'PATCH' : 'POST',
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
