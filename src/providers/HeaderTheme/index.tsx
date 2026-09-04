'use client'

import React, { createContext, useCallback, use, useState } from 'react'

export interface ContextType {
  /** True while the page has a full-bleed photo behind the header. */
  overHero: boolean
  setOverHero: (overHero: boolean) => void
}

const initialContext: ContextType = {
  overHero: false,
  setOverHero: () => null,
}

const HeaderThemeContext = createContext(initialContext)

/**
 * Lets a page tell the header it sits over a full-bleed photo. Starts unset
 * on both server and client so the header hydrates the same way everywhere;
 * heroes set it in an effect.
 */
export const HeaderThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [overHero, setState] = useState(false)
  const setOverHero = useCallback((value: boolean) => setState(value), [])
  return <HeaderThemeContext value={{ overHero, setOverHero }}>{children}</HeaderThemeContext>
}

export const useHeaderTheme = (): ContextType => use(HeaderThemeContext)
