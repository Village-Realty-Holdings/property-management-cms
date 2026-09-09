'use client'

import { useEffect, useRef } from 'react'

import type { CanvasStyles } from './canvasStyles'

/**
 * Root of a canvas iframe: the public page's stylesheets, and its <html>
 * class (next/font variables) on the iframe's own <html> so font tokens
 * resolve the same way they do on the site. Used by the editor canvas and by
 * the add-block dialog's preview.
 */
export function CanvasFrame({
  styles,
  children,
}: {
  styles: CanvasStyles
  children: React.ReactNode
}) {
  const marker = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const doc = marker.current?.ownerDocument
    if (!doc) return
    const html = doc.documentElement
    const classes = styles.htmlClass.split(/\s+/).filter(Boolean)
    html.classList.add(...classes)
    // React can hoist metadata out of an iframe portal. Attach resources to
    // the marker's document explicitly so frontend CSS stays in the canvas.
    const nodes = [
      ...styles.links.map((href) => {
        const link = doc.createElement('link')
        link.rel = 'stylesheet'
        link.href = href
        return link
      }),
      ...styles.inline.map((css) => {
        const style = doc.createElement('style')
        style.textContent = css
        return style
      }),
    ]
    nodes.forEach((node) => doc.head.appendChild(node))
    return () => {
      nodes.forEach((node) => node.remove())
      html.classList.remove(...classes)
    }
  }, [styles.htmlClass, styles.links, styles.inline])
  return (
    <>
      <span hidden ref={marker} />
      {children}
    </>
  )
}
