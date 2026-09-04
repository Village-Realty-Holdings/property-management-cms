import React from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const ShadcnDemo: React.FC = () => (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle>shadcn/ui in the admin panel</CardTitle>
      <CardDescription>
        Tailwind and shadcn/ui components are available inside the Payload admin.
      </CardDescription>
    </CardHeader>
    <CardContent className="flex items-center gap-2 text-muted-foreground">
      <span className="inline-block size-2 rounded-full bg-primary" />
      Remove this card from BeforeDashboard once you no longer need it.
    </CardContent>
  </Card>
)
