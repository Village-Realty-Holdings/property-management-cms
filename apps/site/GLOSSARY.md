# Awayday Site Builder

One website that Awayday staff build and edit in one place. Staff compose Pages from Blocks, edit them on the page as visitors will see it, and publish.

## Language

### The Site

**Site**:
The one public website this app serves. There is exactly one, so content never says which Site it belongs to.
_Avoid_: Tenant, brand, client

**Site Settings**:
The Site's general details and branding: name, domain, logo, colours, fonts, tagline and contact details.
_Avoid_: Config, theme, preferences

### Content

**Page**:
A page of the Site at its own path (such as Home, About or Contact), composed from Blocks.
_Avoid_: Landing page, screen, post

**Block**:
A reusable, configurable section of a Page, such as a hero, a rich text section or a call to action.
_Avoid_: Component, widget, section, element

**Media**:
An image uploaded by staff for use on Pages and in Site Settings.
_Avoid_: Asset, file, upload (as model names)

**Draft** / **Published**:
The lifecycle of a Page. Staff edit the Draft, and visitors see only the Published version until the Draft is published.
_Avoid_: Staging, live copy, unpublished

### Editing

**Admin**:
The place Staff Users sign in to manage Pages, Media and Site Settings.
_Avoid_: Dashboard, back office, CMS (for the admin itself)

**Visual Editor**:
The part of the Admin where a Staff User edits a Page on the rendered page itself: clicking a Block or its text to change it, and adding or reordering Blocks.
_Avoid_: Page builder, live preview, inline editing (as the feature name)

### People

**Staff User**:
An Awayday employee who signs into the Admin with their Awayday Microsoft account. Every Staff User can do everything in the Admin. Visitors never sign in.
_Avoid_: Admin (for a person), editor, account, member
