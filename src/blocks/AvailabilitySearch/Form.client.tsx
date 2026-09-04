'use client'

import React, { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'

import type { PropertyNode } from '@/server/properties/types'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { searchParamKeys as k } from '@/server/properties/format'
import { cn } from '@/lib/ui'

type Props = {
  action: string
  buttonLabel: string
  layout: 'bar' | 'card'
  nodes: PropertyNode[]
  showBedrooms: boolean
  showPets: boolean
}

const today = () => new Date().toISOString().slice(0, 10)
const plusDays = (iso: string, days: number) => {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export const SearchForm: React.FC<Props> = ({
  action,
  buttonLabel,
  layout,
  nodes,
  showBedrooms,
  showPets,
}) => {
  const params = useSearchParams()
  const [arrival, setArrival] = useState(params.get(k.arrival) ?? '')
  const [departure, setDeparture] = useState(params.get(k.departure) ?? '')

  // Group nodes under their parent so the select reads like the sites' "Search by complex".
  const grouped = useMemo(() => {
    const byParent = new Map<string | null, PropertyNode[]>()
    for (const n of nodes) {
      const list = byParent.get(n.parentId) ?? []
      list.push(n)
      byParent.set(n.parentId, list)
    }
    const ids = new Set(nodes.map((n) => n.id))
    const roots = nodes.filter((n) => !n.parentId || !ids.has(n.parentId))
    const walk = (n: PropertyNode, depth: number): { node: PropertyNode; depth: number }[] => [
      { node: n, depth },
      ...(byParent.get(n.id) ?? []).flatMap((c) => walk(c, depth + 1)),
    ]
    return roots.flatMap((r) => walk(r, 0))
  }, [nodes])

  const isBar = layout === 'bar'
  const field = cn('flex flex-col gap-1.5', isBar && 'min-w-[9rem] flex-1')

  return (
    <form
      action={action}
      method="get"
      className={cn(
        'surface p-4 shadow-lg shadow-foreground/5 md:p-5',
        isBar ? 'flex flex-wrap items-end gap-3' : 'flex flex-col gap-4',
      )}
    >
      <div className={field}>
        <Label htmlFor="as-arrival">Arrival</Label>
        <Input
          id="as-arrival"
          name={k.arrival}
          type="date"
          min={today()}
          value={arrival}
          onChange={(e) => {
            setArrival(e.target.value)
            if (departure && departure <= e.target.value) setDeparture(plusDays(e.target.value, 3))
          }}
        />
      </div>
      <div className={field}>
        <Label htmlFor="as-departure">Departure</Label>
        <Input
          id="as-departure"
          name={k.departure}
          type="date"
          min={arrival ? plusDays(arrival, 1) : today()}
          value={departure}
          onChange={(e) => setDeparture(e.target.value)}
        />
      </div>
      <div className={field}>
        <Label htmlFor="as-guests">Guests</Label>
        <NativeSelect id="as-guests" name={k.guests} defaultValue={params.get(k.guests) ?? ''}>
          <option value="">Any</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map((n) => (
            <option key={n} value={n}>
              {n}
              {n === 12 ? '+' : ''}
            </option>
          ))}
        </NativeSelect>
      </div>
      {showBedrooms && (
        <div className={field}>
          <Label htmlFor="as-bedrooms">Bedrooms</Label>
          <NativeSelect id="as-bedrooms" name={k.bedrooms} defaultValue={params.get(k.bedrooms) ?? ''}>
            <option value="">Any</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </NativeSelect>
        </div>
      )}
      {nodes.length > 0 && (
        <div className={cn(field, isBar && 'min-w-[12rem]')}>
          <Label htmlFor="as-node">Location</Label>
          <NativeSelect id="as-node" name={k.node} defaultValue={params.get(k.node) ?? ''}>
            <option value="">Anywhere</option>
            {grouped.map(({ node, depth }) => (
              <option key={node.id} value={node.id}>
                {'  '.repeat(depth)}
                {node.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}
      {showPets && (
        <Label className={cn('gap-2 font-normal', isBar && 'h-10 self-end')}>
          <Checkbox name={k.pets} value="1" defaultChecked={params.get(k.pets) === '1'} />
          Pet friendly
        </Label>
      )}
      <Button type="submit" className={cn(!isBar && 'w-full')}>
        <Search data-icon="inline-start" aria-hidden="true" />
        {buttonLabel}
      </Button>
    </form>
  )
}
