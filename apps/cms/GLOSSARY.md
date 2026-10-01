# Awayday Property CMS

> **Reference only.** apps/cms is the multi-site MVP (tag `archive/mvp-2026-09`). It is kept while its code is ported into apps/site, then removed. New work follows `apps/site/GLOSSARY.md` and `apps/site/docs/adr/` (apps/site ADR-0001).

Awayday's multi-site content platform for vacation-rental clients. Each Site is a client's public booking website. The CMS holds editorial content on top of properties whose facts, availability and quotes come from the Property Feed.

## Language

### Tenancy

**Site**:
One client's public vacation-rental website on its own domain. It is the unit of tenancy: every piece of content belongs to exactly one Site, and nothing is shared between Sites.
_Avoid_: Tenant (in conversation), brand, client, account

**Client**:
The rental company that Awayday builds and runs a Site for. The CMS models Sites, not Clients: a Site knows only its Client's name and website. In a Tuck-In, the Client is the company the Former Brand joined.
_Avoid_: Customer, owner, acquirer

**Former Brand**:
A rental company that has joined a Client. Its old domain becomes a Site named after it, which announces the change with a Tuck-In.
_Avoid_: Acquired brand, old brand, brand

**Section**:
A part of the CMS that a Site can go without: Properties, Inbox, Guides or Curated Lists. Pages, Media and Site Settings are on every Site.
_Avoid_: Feature, module, element

### Properties

**Property**:
A single vacation rental that guests book as one unit, belonging to one Site. It corresponds to exactly one Feed Listing.
_Avoid_: Listing (reserved for the feed side), rental, unit, cabin, condo (use as descriptive copy only)

**Feed Listing**:
The Property Feed's record of a bookable vacation rental, identified by a Feed ID.
_Avoid_: PMS listing, channel listing

**Property Facts**:
The parts of a Property owned by the Property Feed (such as capacity, bedrooms, address, Amenities and photos). They are read-only in the CMS.
_Avoid_: PMS data, synced fields

**Editorial Content**:
The parts of a Property that Staff Users write in the CMS (such as headline, description and SEO). The Sync never overwrites it.
_Avoid_: Marketing data, overrides

**Amenity**:
A feature guests can filter by (such as a hot tub or ski-in/ski-out), from one Awayday-wide vocabulary that the Property Feed maps every PMS onto. It is shared reference data, not Site content. Which Amenities a Property has is a Property Fact.
_Avoid_: Feature, facility

**Amenity Presentation**:
A Site's choices about Amenities: which are search filters, how they're grouped, labelled, iconed and ordered.
_Avoid_: Top amenities, featured filters

**Property Type**:
The kind of dwelling (such as cabin, condo, house or townhouse), from one Awayday-wide vocabulary that the Property Feed maps every PMS onto. A Site can relabel types for its guests.
_Avoid_: Unit type, lodging type, home type

**Room**:
A bedroom or sleeping space in a Property, with its beds and how many it sleeps. It is a Property Fact.
_Avoid_: Sleeping arrangement, bed configuration (as model names)

**Stay Policy**:
The terms of staying at a Property: check-in and check-out times, house rules, and cancellation and deposit terms. It is a Property Fact. Where the Feed has no value, the Site's default Stay Policy applies.
_Avoid_: Rules, terms, guarantee policy

**Active** / **Withdrawn**:
A Property is Active while its Feed Listing is active, and shown on its Site from the moment the Sync creates it. It is Withdrawn when its Feed Listing is deactivated or disappears. A Withdrawn Property is hidden but kept intact, and becomes Active again if the listing returns.
_Avoid_: Published/unpublished, archived, deleted (for Properties)

**Location**:
A place in a Site's location tree, mirrored from the Property Feed's nodes. Each Property belongs to exactly one Location. A Location can sit inside a parent Location.
_Avoid_: Destination, region, area, node (as model names)

**Location Level**:
The role an Admin gives a Location on the Site: Destination, Area or Complex. It decides how the Location appears in navigation, search and URLs, independent of how the PMS labels the node.
_Avoid_: Search level, node type

**Complex**:
A Location at the Complex Level: a resort, building or community whose Properties share an address, amenities and rules (for example "Long Beach Resort").
_Avoid_: Resort, building, development (as model names)

**Special**:
A promotion mirrored from the Property Feed. The Feed owns its rules, the Properties it applies to and its validity dates, and Quotes apply it. The CMS adds public copy and decides whether guests see it. A Special disappears from the Site automatically when it expires.
_Avoid_: Promo, deal, offer, discount (as model names)

**Review**:
A guest's rating and comment about a stay at a Property, optionally with a manager's response. It is mirrored from the Property Feed, which aggregates review sources. The CMS only decides whether it is shown.
_Avoid_: Testimonial (for guest stay reviews)

**Moderation**:
The CMS decision to show or hide a Review. It is applied automatically by a Site's rule or made by an Editor.

**Rating**:
A Property's average score, computed from its shown Reviews only.

### Guest-facing live data

**Availability**:
Whether a Property can be booked for given dates. It is always read live from the Property Feed and never stored in the CMS.

**Quote**:
The Property Feed's priced breakdown (rent, fees, taxes, total) for a Property, dates and party. It is always live and never stored in the CMS.
_Avoid_: Price, rate (for the total)

### Editorial

**Page**:
A standalone Site page (such as Home, About or FAQ) that is composed from Blocks.
_Avoid_: Landing page (as a model name)

**Block**:
A reusable, configurable section of a Page (such as a hero, a text section or a Property carousel).
_Avoid_: Component, widget, section

**Guide**:
An editorial article that can relate to Locations and Properties (for example, "Best walks near Park City").
_Avoid_: Blog post, post, article

**Curated List**:
A named, themed set of Properties (for example, "Pet-friendly Destin rentals") that is defined by a rule over Property Facts and Location. Its members change as the Sync runs.
_Avoid_: Collection (clashes with Payload), theme, edit, category

**Page Template**:
A starting Page layout, a fixed set of Blocks with sample copy, that an editor fills in. Tuck-In comes first; Grow and Feedback are planned.
_Avoid_: Theme, layout

**Tuck-In**:
A Page Template announcing to owners and guests that a Former Brand has joined a Client. It names the template, not the Site that uses it.
_Avoid_: Landing page, acquisition page, merger page

**Variable**:
A named value such as `{phone}` or `{client}` that is written into Page or Guide copy, SEO fields or links, and is replaced with the Site's current value wherever it appears. Most come from Site Settings; Admins can add Custom Variables of their own for a Site.
_Avoid_: Placeholder, token, merge field, shortcode

**Draft** / **Published**:
The editorial lifecycle of Pages, Guides and Curated Lists. Properties and Locations have no Draft state.

**Preview**:
A Draft drawn as its Site will show it, inside the CMS and only for logged-in Staff Users. The CMS draws it; the Site's deployment isn't involved until the Draft is Published.
_Avoid_: Draft Mode, staging, preview site

**Site Settings**:
Per-Site configuration and content, such as domain, branding, navigation, footer, contact details and legacy URL scheme.

### Submissions

**Submission**:
A form entry a visitor sends from a Site. It is stored in the CMS against its Site and forwarded to that Site's configured destination.
_Avoid_: Lead, contact, message (as model names)

**Inquiry**:
A Submission from a prospective guest asking about a Property or a stay.
_Avoid_: Enquiry, question

**Owner Lead**:
A Submission from a property owner interested in Awayday's Client managing their home.
_Avoid_: Owner inquiry, rental projection request

**Forwarding Destination**:
Where a Site sends a kind of Submission after storing it (such as the PMS CRM through the Feed, a CRM webhook, or email).

### Integration

**Property Feed**:
Awayday's API, still to be built, that sits in front of each Site's PMS accounts (Track, Streamline, and later others). It serves Feed Listings, Availability, Quotes and bookings. It lives outside this project and replaces the legacy plugin's per-PMS adapters.
_Avoid_: PMS, gateway, channel manager, Channel API

**PMS**:
The client's property management system (Track, Streamline). The CMS and Sites never talk to a PMS directly, only to the Property Feed.

**Sync**:
The process that creates and updates Properties and Locations from the Property Feed. It is the only way either comes into existence.
_Avoid_: Import

### People

**Staff User**:
An Awayday employee who signs into the CMS with their Awayday Microsoft account. Clients and guests never log in.
_Avoid_: Account, member, customer

**Site Assignment**:
The set of Sites a Staff User can access. A Staff User sees nothing outside their assigned Sites.

**Admin**:
A Staff User who manages Site Settings, Locations and Staff Users for their assigned Sites, and can do everything an Editor can there.

**Editor**:
A Staff User who writes and publishes content on their assigned Sites.
_Avoid_: Manager, contributor

**Super Admin**:
A Staff User who is not limited by Site Assignment. They create Sites and manage the whole platform.
_Avoid_: Root, owner

### Deferred

**Place** (Things to Do / points of interest):
Not modelled in v1. Things to Do content is written as Guides until then.

**Guest accounts** and **Favourites**:
Not in v1.

**Long-term stays** (monthly, snowbird):
Not in v1.

### Out of scope

**Booking**, **Guest**, **Rate calendar**:
These are owned by the PMSs behind the Property Feed. The CMS never stores them. Guest details that appear in Submissions are the only exception.
