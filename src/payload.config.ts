import { sqliteD1Adapter } from '@payloadcms/db-d1-sqlite'
import { r2Storage } from '@payloadcms/storage-r2'
import { getCloudflareContext, type CloudflareContext } from '@opennextjs/cloudflare'
import type { GetPlatformProxyOptions } from 'wrangler'
import fs from 'fs'
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'

import { Categories } from './collections/Categories'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Tenants } from './collections/Tenants'
import { Users } from './collections/Users'
import { Footer } from './Footer/config'
import { Header } from './Header/config'
import { SiteSettings } from './SiteSettings/config'
import { Theme } from './Theme/config'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from '@/lib/getURL'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// --- Cloudflare bindings -------------------------------------------------
// Adapted from Payload's `templates/with-cloudflare-d1`. Inside the deployed
// Worker the D1/R2 bindings come from `getCloudflareContext`. Under `next dev`
// and the Payload CLI (`payload migrate`, `generate:types`) they come from
// wrangler's local platform proxy instead.

const realpath = (value: string) => {
  try {
    return fs.existsSync(value) ? fs.realpathSync(value) : undefined
  } catch {
    return undefined
  }
}

const isCLI = process.argv.some((value) => {
  const resolved = realpath(value)
  if (!resolved) return false
  return (
    resolved.endsWith(path.join('payload', 'bin.js')) ||
    resolved.endsWith(path.join('next', 'dist', 'bin', 'next'))
  )
})
const isProduction = process.env.NODE_ENV === 'production'

// `wrangler` must never be bundled into the Worker, hence the obfuscated
// dynamic import. `remoteBindings` is only true in production mode, so
// `NODE_ENV=production payload migrate` targets the real D1 database while
// local dev uses the copy under `.wrangler/state`.
function getCloudflareContextFromWrangler(): Promise<CloudflareContext> {
  return import(/* webpackIgnore: true */ `${'__wrangler'.replaceAll('_', '')}`).then(
    ({ getPlatformProxy }) =>
      getPlatformProxy({
        environment: process.env.CLOUDFLARE_ENV,
        remoteBindings: isProduction,
      } satisfies GetPlatformProxyOptions),
  )
}

const createLog =
  (level: string, fn: typeof console.log) => (objOrMsg: object | string, msg?: string) => {
    if (typeof objOrMsg === 'string') {
      fn(JSON.stringify({ level, msg: objOrMsg }))
    } else {
      fn(JSON.stringify({ level, ...objOrMsg, msg: msg ?? (objOrMsg as { msg?: string }).msg }))
    }
  }

// Pino does not run in workerd; log JSON lines through console instead.
const cloudflareLogger = {
  level: process.env.PAYLOAD_LOG_LEVEL || 'info',
  trace: createLog('trace', console.debug),
  debug: createLog('debug', console.debug),
  info: createLog('info', console.log),
  warn: createLog('warn', console.warn),
  error: createLog('error', console.error),
  fatal: createLog('fatal', console.error),
  silent: () => {},
} as any // Use PayloadLogger type when it's exported

const cloudflare =
  isCLI || !isProduction
    ? await getCloudflareContextFromWrangler()
    : await getCloudflareContext({ async: true })

export default buildConfig({
  admin: {
    // Branding follows the request host: a tenant's domain shows that tenant's
    // logo, icon and accent, anything else shows Awayday. See `src/lib/adminBranding.ts`.
    components: {
      afterNavLinks: ['@/components/admin/Branding/NavFooter#NavFooter'],
      beforeLogin: ['@/components/BeforeLogin'],
      graphics: {
        Icon: '@/components/admin/Branding/Icon#Icon',
        Logo: '@/components/admin/Branding/Logo#Logo',
      },
      providers: ['@/components/admin/Branding/AccentStyle#AccentStyle'],
    },
    meta: {
      description: 'Manage your Awayday site.',
      icons: [
        { rel: 'icon', sizes: '32x32', type: 'image/png', url: '/admin/awayday-favicon-32.png' },
        { rel: 'icon', sizes: '192x192', type: 'image/png', url: '/admin/awayday-favicon-192.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', type: 'image/png', url: '/admin/awayday-apple-touch-icon.png' },
      ],
      openGraph: {
        description: 'Manage your Awayday site.',
        images: [{ url: '/admin/awayday-logo.png', width: 475, height: 101 }],
        siteName: 'Awayday',
        title: 'Awayday Admin',
      },
      titleSuffix: '· Awayday',
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
    theme: 'light',
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },
  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  // `push: false`: local D1 is built from `src/migrations/` like production
  // (`npm run migrate`). Dev-mode push conflicts with a migrated database.
  db: sqliteD1Adapter({ binding: cloudflare.env.D1, push: false }),
  collections: [Pages, Posts, Media, Categories, Tenants, Users, Header, Footer, Theme, SiteSettings],
  cors: [getServerSideURL()].filter(Boolean),
  logger: isProduction ? cloudflareLogger : undefined,
  plugins: [
    ...plugins,
    // Uploads land in the R2 bucket bound as `R2` in `wrangler.jsonc`.
    r2Storage({
      bucket: cloudflare.env.R2,
      collections: { media: true },
    }),
  ],
  secret: process.env.PAYLOAD_SECRET,
  // No `sharp`: it cannot run in Workers. Images are resized at render time
  // by `next/image` through the Cloudflare Images binding instead.
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        // Allow logged in users to execute this endpoint (default)
        if (req.user) return true

        const secret = process.env.CRON_SECRET
        if (!secret) return false

        // If there is no logged in user, then check
        // for the cron secret to be present as an
        // Authorization header:
        const authHeader = req.headers.get('authorization')
        return authHeader === `Bearer ${secret}`
      },
    },
    tasks: [],
  },
})
