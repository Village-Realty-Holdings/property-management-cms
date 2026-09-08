'use client'

import { useEffect, useRef } from 'react'

import type { CanvasStyles } from './canvasStyles'

/**
 * Root of a canvas iframe: the public page's stylesheets, and its <html>
 * class (next/font variables) on the iframe's own <html> so font tokens
 * resolve the same way they do on the site. Used by the editor canvas and by
 * the add-block dialog's preview.
 */
export function CanvasFrame({ styles, children }: { styles: CanvasStyles; children: React.ReactNode }) {
  const marker = useRef<HTMLMetaElement>(null)
  useEffect(() => {
    const html = marker.current?.ownerDocument.documentElement
    if (!html) return
    const classes = styles.htmlClass.split(/\s+/).filter(Boolean)
    html.classList.add(...classes)
    return () => html.classList.remove(...classes)
  }, [styles.htmlClass])
  return (
    <>
      <meta name="canvas-root" ref={marker} />
      {styles.links.map((href) => (
        <link href={href} key={href} rel="stylesheet" />
      ))}
      {styles.inline.map((css, i) => (
        <style dangerouslySetInnerHTML={{ __html: css }} key={i} />
      ))}
      {children}
    </>
  )
}
