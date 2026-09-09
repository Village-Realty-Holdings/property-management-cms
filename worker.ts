/**
 * Worker entry (see `main` in wrangler.jsonc). Wraps the handler that
 * `opennextjs-cloudflare build` generates in `.open-next/worker.js`.
 *
 * OpenNext resolves a relative `/_next/image?url=/...` through the ASSETS
 * binding, which only serves static files. Payload media lives in R2 and is
 * served by the dynamic `/api/media/file/*` route, so ASSETS answers 404 and
 * every optimised image on the site breaks. For those requests the ASSETS
 * binding is swapped for one that routes the fetch back into the Next handler.
 * See https://opennext.js.org/cloudflare/howtos/custom-worker
 */
// @ts-expect-error `.open-next/worker.js` is generated at build time
import { default as handler } from './.open-next/worker.js'

const MEDIA_PREFIX = '/api/media/file/'

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const source = url.searchParams.get('url') ?? ''
    if (url.pathname === '/_next/image' && source.startsWith(MEDIA_PREFIX)) {
      const ASSETS = {
        fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
          const res: Response = await handler.fetch(new Request(input, init), env, ctx)
          // OpenNext reads the body with a BYOB reader, which the Next
          // handler's JS-backed stream does not support. Buffer it into a
          // byte-oriented body (uploads are single originals, a few hundred KB).
          return res.ok ? new Response(await res.arrayBuffer(), res) : res
        },
      }
      try {
        return await handler.fetch(request, { ...env, ASSETS }, ctx)
      } catch (error) {
        // The Images binding can reject the transform (for example
        // IMAGES_TRANSFORM_ERROR 9432 on accounts still on legacy Images
        // billing). Without the binding OpenNext serves the original as is,
        // so retry that way rather than failing the whole image.
        console.error('next/image transform failed, serving original', error)
        return handler.fetch(request, { ...env, ASSETS, IMAGES: undefined }, ctx)
      }
    }
    return handler.fetch(request, env, ctx)
  },
} satisfies ExportedHandler<CloudflareEnv>

// @ts-expect-error `.open-next/worker.js` is generated at build time
export { BucketCachePurge, DOQueueHandler, DOShardedTagCache } from './.open-next/worker.js'
