import type { Metadata } from 'next'

import { cn } from '@/lib/ui'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import React from 'react'

import { AdminBar } from '@/components/AdminBar'
import { Footer } from '@/Footer/Component'
import { Header } from '@/Header/Component'
import { Providers } from '@/providers'
import { TenantThemeStyle } from '@/Theme/Component'
import { fontClassNames } from '@/Theme/fonts'
import { getTenantGlobal } from '@/server/getGlobals'
import { themeFonts } from '@/lib/themeCss'
import { getSiteMeta } from '@/seo/generateMeta'
import { mergeOpenGraph } from '@/seo/mergeOpenGraph'
import { draftMode } from 'next/headers'

import './globals.css'
import { getServerSideURL } from '@/lib/getURL'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled } = await draftMode()
  const theme = await getTenantGlobal('theme', 0)

  return (
    <html
      className={cn(GeistSans.variable, GeistMono.variable, ...fontClassNames(themeFonts(theme)))}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <TenantThemeStyle theme={theme} />
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
      </head>
      <body>
        <Providers>
          <AdminBar
            adminBarProps={{
              preview: isEnabled,
            }}
          />

          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteMeta()
  return {
    metadataBase: new URL(getServerSideURL()),
    title: site.name ?? undefined,
    description: site.description ?? undefined,
    openGraph: mergeOpenGraph(site),
    twitter: {
      card: 'summary_large_image',
    },
  }
}
