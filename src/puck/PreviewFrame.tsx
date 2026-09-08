'use client'

import { Component, type ReactNode, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'

import { CanvasFrame } from './CanvasFrame'
import type { CanvasStyles } from './canvasStyles'

/**
 * An iframe that renders its children with the public site's stylesheets,
 * the same way the editor canvas does. Used by the add-block dialog so the
 * preview is honest: the admin document has no Tailwind preflight or theme
 * tokens, so rendering a block directly in it would look wrong.
 */
export function PreviewFrame({
  styles,
  width,
  children,
}: {
  styles: CanvasStyles
  width: number | '100%'
  children: ReactNode
}) {
  const [doc, setDoc] = useState<Document | null>(null)
  const onLoad = useCallback((e: React.SyntheticEvent<HTMLIFrameElement>) => {
    const d = e.currentTarget.contentDocument
    if (d) {
      d.body.style.margin = '0'
      setDoc(d)
    }
  }, [])
  return (
    <iframe
      onLoad={onLoad}
      srcDoc="<!doctype html><html><head><meta charset='utf-8'></head><body></body></html>"
      style={{ width, maxWidth: '100%', height: '100%', border: 0, background: '#fff', display: 'block' }}
      title="Block preview"
    >
      {doc &&
        createPortal(
          <CanvasFrame styles={styles}>
            <PreviewBoundary>{children}</PreviewBoundary>
          </CanvasFrame>,
          doc.body,
        )}
    </iframe>
  )
}

/** A block that throws on half-filled settings should not take the dialog down. */
class PreviewBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null }
  static getDerivedStateFromError(e: Error) {
    return { error: e.message }
  }
  componentDidUpdate(prev: { children: ReactNode }) {
    if (prev.children !== this.props.children && this.state.error) this.setState({ error: null })
  }
  render() {
    if (this.state.error)
      return (
        <p style={{ padding: 24, fontFamily: 'system-ui, sans-serif', fontSize: 13, opacity: 0.7 }}>
          Preview unavailable until more settings are filled in.
        </p>
      )
    return this.props.children
  }
}
