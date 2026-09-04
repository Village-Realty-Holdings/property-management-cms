'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import React, { useState } from 'react'
import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'

import type { Theme } from './types'

import { useTheme } from '..'
import { themeLocalStorageKey } from './types'

const options = [
  { value: 'auto', label: 'System', Icon: MonitorIcon },
  { value: 'light', label: 'Light', Icon: SunIcon },
  { value: 'dark', label: 'Dark', Icon: MoonIcon },
]

export const ThemeSelector: React.FC = () => {
  const { setTheme } = useTheme()
  const [value, setValue] = useState('auto')

  const onThemeChange = (themeToSet: string | null) => {
    if (!themeToSet || themeToSet === 'auto') {
      setTheme(null)
      setValue('auto')
    } else {
      setTheme(themeToSet as Theme)
      setValue(themeToSet)
    }
  }

  React.useEffect(() => {
    const preference = window.localStorage.getItem(themeLocalStorageKey)
    setValue(preference ?? 'auto')
  }, [])

  return (
    <Select onValueChange={onThemeChange} value={value}>
      <SelectTrigger aria-label="Colour theme" size="sm" className="w-auto gap-2 bg-background">
        <SelectValue placeholder="Theme" />
      </SelectTrigger>
      <SelectContent align="end">
        {options.map(({ value, label, Icon }) => (
          <SelectItem key={value} value={value}>
            <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
