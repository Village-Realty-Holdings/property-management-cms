'use client'

import { Button, useForm, useFormFields } from '@payloadcms/ui'
import type { UIFieldClientComponent } from 'payload'
import { useState } from 'react'

import { findPreset, PALETTE_SLOTS } from '@/lib/themePresets'

/**
 * Copies the selected preset into the theme fields. Only a one-off write:
 * the fields stay editable and nothing re-applies when the select changes.
 */
export const ApplyPreset: UIFieldClientComponent = () => {
  const { dispatchFields } = useForm()
  const presetKey = useFormFields(([fields]) => fields['preset']?.value)
  const preset = findPreset(presetKey)
  const [applied, setApplied] = useState<string | null>(null)

  const apply = () => {
    if (!preset) return
    const set = (path: string, value: unknown) =>
      dispatchFields({ type: 'UPDATE', path, value: value ?? null })
    for (const slot of PALETTE_SLOTS) set(`light.${slot}`, preset.light[slot])
    set('typography.bodyFont', preset.typography.bodyFont)
    set('typography.headingFont', preset.typography.headingFont)
    set('shape.radius', preset.shape.radius)
    setApplied(preset.label)
  }

  return (
    <div style={{ marginBottom: 'var(--base)' }}>
      <div style={{ display: 'inline-block' }}>
        <Button buttonStyle="secondary" size="medium" disabled={!preset} onClick={apply} type="button" margin={false}>
          Apply preset
        </Button>
      </div>
      <p style={{ margin: '0.5rem 0 0', color: 'var(--theme-elevation-500)', fontSize: '0.85rem' }}>
        {preset
          ? preset.description
          : 'Pick a preset to fill in the colours, fonts and corner rounding below. Save afterwards to keep it.'}
        {applied ? ` Applied "${applied}"; adjust any field and save.` : ''}
      </p>
    </div>
  )
}
