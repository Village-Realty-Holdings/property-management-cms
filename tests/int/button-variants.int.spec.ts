import { describe, expect, it } from 'vitest'

import { buttonVariants } from '@/components/ui/button'

/*
 * CMSLink renders appearance="link" through Button with size="clear". The
 * base-nova style dropped that size, which silently gave every CMS link
 * button padding and a fixed height. Types can't catch it, so pin it here.
 */
describe('buttonVariants', () => {
  it('gives the clear size no box', () => {
    const classes = buttonVariants({ variant: 'link', size: 'clear' })

    expect(classes).toContain('h-auto')
    expect(classes).toContain('px-0')
    expect(classes).not.toMatch(/\bh-10\b/)
    expect(classes).not.toMatch(/\bpx-4\b/)
  })

  it('still boxes the default size', () => {
    const classes = buttonVariants({ variant: 'default', size: 'default' })

    expect(classes).toMatch(/\bh-10\b/)
    expect(classes).toMatch(/\bpx-4\b/)
  })
})
