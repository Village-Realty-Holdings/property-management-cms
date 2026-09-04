import type { Metadata } from 'next'

import { cn } from '@/lib/ui'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import React from 'react'

import { AdminBar } from '@/components/AdminBar'
import { Footer } from '@/Footer/Component'
import { Header } from '@/Header/Component'
import { Providers } from '@/providers'
import { InitTheme } from '@/providers/Theme/InitTheme'
import { TenantThemeStyle } from '@/Theme/Component'
import { fontClassNames } from '@/Theme/fonts'
import { getTenantGlobal } from '@/server/getGlobals'
import { themeFonts } from '@/lib/themeCss'
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
        <InitTheme />
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
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  metadataBase: new URL(getServerSideURL()),
  openGraph: mergeOpenGraph(),
  twitter: {
    card: 'summary_large_image',
    creator: '@payloadcms',
  },
}
