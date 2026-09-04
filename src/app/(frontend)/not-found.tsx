import Link from 'next/link'
import React from 'react'

import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="container flex flex-1 flex-col justify-center py-24 md:py-32">
      <div className="max-w-[40rem]">
        <p className="text-sm text-muted-foreground">Error 404</p>
        <h1 className="mt-2 text-display">We can&apos;t find that page.</h1>
        <p className="mt-4 text-lead text-muted-foreground">
          The link may be out of date, or the page may have moved.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button size="lg" nativeButton={false} render={<Link href="/" />}>
            Back to the home page
          </Button>
          <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/rentals" />}>
            Browse rentals
          </Button>
        </div>
      </div>
    </div>
  )
}
