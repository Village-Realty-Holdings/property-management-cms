# Feed photos are referenced by URL, editorial media goes to R2, and images are resized by Cloudflare Images

Property photos are Property Facts, so the Sync stores them as URLs with their dimensions and order. They aren't copied into Payload Media. The `media` upload collection holds only editorial imagery (Pages, Guides, Locations, Curated Lists). Each file belongs to one Site and is stored under a per-Site key prefix in Cloudflare R2, with local disk in dev. Payload generates no image sizes. apps/site gets every variant (feed photos and editorial media alike) from Cloudflare Images through the `next/image` integration, restricted to the R2 host and the feed photo hosts.

## Considered Options

- **Ingest feed photos into Media.** Rejected. Thousands of files would need de-duplication and deletion tracking, all for images we don't curate.
- **Payload `imageSizes` generated with sharp.** Rejected. sharp isn't available on Workers (ADR-0015), and delivery-time resizing serves both kinds of photo the same way.

## Consequences

- The storage adapter is chosen in `payload.config.ts` only: `@payloadcms/storage-r2` (binding) on Workers, or `@payloadcms/storage-s3` against R2's S3 API on Containers. Both use the same bucket.
- The site depends on the feed photo hosts being stable. If they prove unreliable, we mirror the photos to R2 inside the Sync, and the Property shape stays the same.
- Cloudflare Images usage is billed per transformation.
