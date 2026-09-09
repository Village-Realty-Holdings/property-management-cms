import { cleanup, render } from '@testing-library/react'
import { createPortal } from 'react-dom'
import { afterEach, expect, it } from 'vitest'

import { CanvasFrame } from '@/puck/CanvasFrame'

afterEach(cleanup)

it('attaches frontend styles and fonts to the iframe document and removes them on unmount', () => {
  const iframe = document.createElement('iframe')
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument!
  const { unmount } = render(
    createPortal(
      <CanvasFrame
        styles={{
          links: ['/canvas.css'],
          inline: [':root { --canvas: red; }'],
          htmlClass: 'tenant-font',
        }}
      >
        <p>Canvas</p>
      </CanvasFrame>,
      doc.body,
    ),
  )
  expect(doc.head.querySelector('link')?.getAttribute('href')).toBe('/canvas.css')
  expect(doc.head.querySelector('style')?.textContent).toContain('--canvas: red')
  expect(doc.documentElement.classList.contains('tenant-font')).toBe(true)
  expect(document.head.querySelector('link[href="/canvas.css"]')).toBeNull()
  expect(document.documentElement.classList.contains('tenant-font')).toBe(false)
  unmount()
  expect(doc.head.querySelector('link, style')).toBeNull()
  expect(doc.documentElement.classList.contains('tenant-font')).toBe(false)
  iframe.remove()
})
