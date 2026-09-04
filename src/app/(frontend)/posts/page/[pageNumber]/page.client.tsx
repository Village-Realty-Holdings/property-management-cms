'use client'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import React, { useEffect } from 'react'

const PageClient: React.FC = () => {
  /* Tell the header whether a photo sits behind it. */
  const { setOverHero } = useHeaderTheme()

  useEffect(() => {
    setOverHero(false)
  }, [setOverHero])
  return <React.Fragment />
}

export default PageClient
