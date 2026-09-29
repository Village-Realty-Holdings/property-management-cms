# The Property Feed owns Property Facts and all live booking data

The Property Feed is Awayday's API in front of each Site's PMS accounts. It's still to be built, and it replaces the legacy plugin's hand-written Track and Streamline adapters. The Feed is the source of truth for Property Facts (capacity, bedrooms, address, Amenities, photos), and it serves Availability, Quotes and bookings. The CMS copies Property Facts in through the Sync and adds Editorial Content on top. It never stores Availability, Quotes, rates or bookings: apps/site asks the Feed for those live. Staff Users can't create or delete Properties, or edit Property Facts, in the admin.

The same split applies to everything else the CMS mirrors from the Feed: Locations (ADR-0012), Specials and Reviews. The Feed owns the facts and the lifecycle. The CMS adds only presentation (copy, labels, visibility and Moderation), stored in fields the Sync never writes.

## Considered Options

- **Mirror rates and availability into the CMS** (what the legacy plugin did: about 540 days × every unit × every rate type, refreshed by cron). Rejected. It was the main source of cron timeouts and staleness, and search and quote logic belong with the PMS integration, in the Feed.
- **Site fetches Property Facts live from the Feed too.** Rejected. Landing pages, Curated Lists and SEO pages would depend on the Feed's uptime and query abilities. Synced facts keep content pages fast and independent of the Feed. Only date-dependent data is fetched live.
- **This project talks to each PMS directly.** Rejected. Putting PMS differences behind one Feed contract is the main improvement over the legacy plugin, where `api_type` switches were spread through the code.

## Consequences

- apps/site has two backends: the CMS for content, and the Feed for Availability, Quotes and checkout. Date search results are the Feed's answer, enriched with CMS content.
- The Feed is a dependency on work outside this repo. Its contract (listing shape, change notifications, search, quote, booking) needs to be agreed before the Sync is built.
- Amenities are Property Facts. Any per-Site presentation (labels, icons, which ones are filters) is Site configuration, not something Editors edit on the Property.
- Checkout is expected to go through the Feed, with card data handled by hosted payment fields, so card data never passes through Awayday servers. This is not yet decided, and it's a requirement on the Feed, not on this repo.
