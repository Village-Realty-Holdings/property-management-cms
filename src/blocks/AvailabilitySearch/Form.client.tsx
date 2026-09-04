'use client'

import React, { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CalendarDays, MapPin, Search, Users } from 'lucide-react'

import type { PropertyNode } from '@/server/properties/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  const field = cn('flex flex-col gap-1', isBar ? 'min-w-[9rem] flex-1' : '')
  const control = 'h-10 rounded border border-input bg-background px-3 text-sm'

  return (
    <form
      action={action}
      method="get"
      className={cn(
        'rounded border border-border bg-card p-4 shadow-sm',
        isBar ? 'flex flex-wrap items-end gap-3' : 'flex flex-col gap-4',
      )}
    >
      <div className={field}>
        <Label htmlFor="as-arrival" className="flex items-center gap-1 text-xs">
          <CalendarDays className="size-3" aria-hidden="true" /> Arrival
        </Label>
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
        <Label htmlFor="as-departure" className="flex items-center gap-1 text-xs">
          <CalendarDays className="size-3" aria-hidden="true" /> Departure
        </Label>
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
        <Label htmlFor="as-guests" className="flex items-center gap-1 text-xs">
          <Users className="size-3" aria-hidden="true" /> Guests
        </Label>
        <select id="as-guests" name={k.guests} className={control} defaultValue={params.get(k.guests) ?? ''}>
          <option value="">Any</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map((n) => (
            <option key={n} value={n}>
              {n}
              {n === 12 ? '+' : ''}
            </option>
          ))}
        </select>
      </div>
      {showBedrooms && (
        <div className={field}>
          <Label htmlFor="as-bedrooms" className="text-xs">
            Bedrooms
          </Label>
          <select id="as-bedrooms" name={k.bedrooms} className={control} defaultValue={params.get(k.bedrooms) ?? ''}>
            <option value="">Any</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </select>
        </div>
      )}
      {nodes.length > 0 && (
        <div className={cn(field, isBar && 'min-w-[12rem]')}>
          <Label htmlFor="as-node" className="flex items-center gap-1 text-xs">
            <MapPin className="size-3" aria-hidden="true" /> Location
          </Label>
          <select id="as-node" name={k.node} className={control} defaultValue={params.get(k.node) ?? ''}>
            <option value="">Anywhere</option>
            {grouped.map(({ node, depth }) => (
              <option key={node.id} value={node.id}>
                {'  '.repeat(depth)}
                {node.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {showPets && (
        <label className={cn('flex items-center gap-2 text-sm', isBar && 'h-10 self-end')}>
          <input type="checkbox" name={k.pets} value="1" className="size-4" defaultChecked={params.get(k.pets) === '1'} />
          Pet friendly
        </label>
      )}
      <Button type="submit" size="lg" className={cn(isBar ? 'h-10' : 'w-full')}>
        <Search className="size-4" aria-hidden="true" />
        {buttonLabel}
      </Button>
    </form>
  )
}
