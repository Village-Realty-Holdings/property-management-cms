'use client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import React, { useState, useEffect } from 'react'
import { SearchIcon } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { useRouter, useSearchParams } from 'next/navigation'

export const Search: React.FC = () => {
  const params = useSearchParams()
  const [value, setValue] = useState(params.get('q') ?? '')
  const router = useRouter()

  const debouncedValue = useDebounce(value)

  useEffect(() => {
    router.push(`/search${debouncedValue ? `?q=${encodeURIComponent(debouncedValue)}` : ''}`)
  }, [debouncedValue, router])

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
      }}
      className="relative"
    >
      <Label htmlFor="search" className="sr-only">
        Search the site
      </Label>
      <SearchIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        id="search"
        type="search"
        value={value}
        onChange={(event) => {
          setValue(event.target.value)
        }}
        placeholder="Search pages and posts"
        className="h-12 pl-12 text-base"
      />
    </form>
  )
}
