import React from 'react'

import type { HeroBlock as HeroBlockProps } from '@/payload-types'

import { HighImpactHero } from '@/heros/HighImpact'
import { LowImpactHero } from '@/heros/LowImpact'
import { MediumImpactHero } from '@/heros/MediumImpact'

const heroes = {
  highImpact: HighImpactHero,
  lowImpact: LowImpactHero,
  mediumImpact: MediumImpactHero,
}

export const isFullBleedHero = (block: { blockType?: string; type?: string } | undefined): boolean =>
  block?.blockType === 'hero' && block.type === 'highImpact'

export const HeroBlock: React.FC<HeroBlockProps> = (props) => {
  const Hero = heroes[props.type]
  if (!Hero) return null
  return <Hero {...props} />
}
