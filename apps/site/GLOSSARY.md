# Awayday Site Builder

One website that Awayday staff build and edit in one place. Staff compose Pages from Blocks, edit them on the page as visitors will see it, and publish.

## Language

### The Site

**Site**:
The one public website a deployment serves. Each deployment serves exactly one Site, so content never says which Site it belongs to.
_Avoid_: Tenant, client

**Brand**:
The Site's identity details: name, logo, tagline, contact details and social links.
_Avoid_: Site Brand, Site Settings, branding, config

**SEO**:
How the Site and its Pages appear in search results and link previews: the Site's defaults, and each Page's own title, description and image.
_Avoid_: Metadata, meta tags

**Theme**:
The Site's visual style: its colours, fonts, shape, density, shadows, buttons and motion. There is one Theme, and it applies to every Page.
_Avoid_: Skin, styles, look and feel

**Font**:
A font family uploaded by staff, as one or more files of different weights and styles, for use in the Theme. Fonts are not Media.
_Avoid_: Typeface, font file (for the family)

### Content

**Page**:
A page of the Site at its own path (such as Home, About or Contact), composed from Blocks.
_Avoid_: Landing page, screen, post

**Layout**:
The Header and Footer that wrap a Page's content. One Layout is the Site's default, a Layout can be the default for the Pages under a path, and a Page can use another Layout or none.
_Avoid_: Template, shell, chrome, master page

**Block**:
A reusable, configurable section of a Page, such as a hero, a rich text section or a call to action.
_Avoid_: Component, widget, section, element

**Media**:
An image uploaded by staff for use on Pages, Layouts, the Brand and SEO.
_Avoid_: Asset, file, upload (as model names)

**Draft** / **Published**:
The lifecycle of a Page. Staff edit the Draft, and visitors see only the Published version until the Draft is published.
_Avoid_: Staging, live copy, unpublished

**Rental**:
A vacation property that visitors can book, shown on the Site in Blocks such as Featured rentals.
_Avoid_: Property, listing, unit

### Editing

**Admin**:
The place Staff Users sign in to manage Pages, Layouts, Media, the Brand, SEO and the Theme.
_Avoid_: Back office, CMS (for the admin itself)

**Dashboard**:
The Admin's home page: the Site at a glance and the way into recent work.
_Avoid_: Home (for the Admin page), overview

**Visual Editor**:
The part of the Admin where a Staff User edits a Page or a Layout on the rendered page itself (clicking a Block or its text to change it, adding or reordering Blocks) and edits the Theme while seeing it on real Pages.
_Avoid_: Page builder, live preview, inline editing (as the feature name)

### People

**Staff User**:
An Awayday employee who signs into the Admin with their Awayday Microsoft account. Every Staff User can do everything in the Admin. Visitors never sign in.
_Avoid_: Admin (for a person), editor, account, member
