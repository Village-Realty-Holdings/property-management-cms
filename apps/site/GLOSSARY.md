# Awayday Site Builder

One website that Users build and edit in one place. Users compose Pages from Blocks, edit them on the page as visitors will see it, and publish.

## Language

### The Site

**Site**:
The one public website a deployment serves. Each deployment serves exactly one Site, so content never says which Site it belongs to.
_Avoid_: Tenant, client

**Brand**:
The Site's identity details: name, logo, tagline, contact details and social links. It can hold a second, light logo, which the Logo Block shows on a Primary or Dark band.
_Avoid_: Site Brand, Site Settings, branding, config

**SEO**:
How the Site and its Pages appear in search results and link previews: the Site's defaults, and each Page's own title, description and image.
_Avoid_: Metadata, meta tags

**Theme**:
The Site's visual style: its colours, fonts, shape, density, shadows, buttons and motion. There is one Theme, and it applies to every Page. It works out the colours that carry text so they are readable; a button's text can instead be set to white or dark, and the Theme editor warns when that is hard to read. A Site that has not saved a Theme shows the Classic preset, which is also where a new Theme starts.
_Avoid_: Skin, styles, look and feel

**Saved Theme**:
A named copy of the Theme's settings that Users keep, to apply later or to move to another Site as a file. Saved Themes are listed with the built-in presets under Tools, Themes. The Site still has one Theme: applying a preset or a Saved Theme saves the Theme with those settings, live at once, and the Theme's history can put the earlier one back.
_Avoid_: Theme (for one in the list that isn't applied), template, skin

**Starter Kit**:
What a new Site is set up from in one go: a suggested Theme and a first set of Pages with their Layout, filled in with the Brand and SEO details the form asks for. Kits are built in, such as Tuck-in. Applying one saves the Brand, SEO and Theme and adds its Pages as Drafts; it never replaces a Page that is already there.
_Avoid_: Template (a Page Template is one Page to start a Page from), preset, seed, site template

**Font**:
A font family Users have added, as one or more files of different weights and styles, for use in the Theme. A Font is uploaded by Users, or added from Google Fonts by name: the Site downloads its files once, stores them, and serves them itself, so visitors' browsers never ask Google. The Site's six built-in fonts are quick picks in the Theme, not stored Fonts. Fonts are not Media.
A Font with no files is treated as missing: the Site shows the built-in stand-in instead, never a bare family name that would depend on the visitor's machine.
_Known edge case_: when a stored Font has the same family name as a built-in font, the stored Font wins because a User added it deliberately, and the built-in quick pick of that name is hidden while the stored Font exists.
_Avoid_: Typeface, font file (for the family)

### Content

**Page**:
A page of the Site at its own path (such as Home, About or Contact), composed from Blocks.
_Avoid_: Landing page, screen, post

**Page file**:
A Page exported from the Pages list as a file: its title, path, Blocks, SEO and Layout choice, with its images by Media file name. Importing one adds it to a Site as a new Draft; it never replaces a Page.
_Avoid_: Backup, dump, template (a Page Template is a Page on the Site)

**Layout**:
The Header and Footer that wrap a Page's content. One Layout is the Site's default, a Layout can be the default for the Pages under a path, and a Page can use another Layout or none.
_Avoid_: Template, shell, chrome, master page

**Page Template**:
A Page that new Pages can start from. Users turn any unpublished Page into one, and a Page Template is never published, so visitors never see it. A Page made from it gets its own copy of the Blocks and the Layout choice, so changing or deleting the Page Template never changes that Page. A Site can add three starters: Home, Tuck-in (an announcement that a company has joined the brand), and Guest feedback survey (what a guest opens after a stay).
_Avoid_: Template (on its own: it could mean a Layout), preset, blueprint, starter (for one made by a User), Starter Kit (that sets up a Site)

**Block**:
A reusable, configurable section of a Page, such as a hero, a rich text section or a call to action. A Block sits on the Page itself or inside a Container.
_Avoid_: Component, widget, section, element

**Style** (of a Block):
How a Block looks, apart from what it says: its background, one of the Theme's colours, and its text colour, worked out from the background or set to white or dark. The Block tab shows it under Style, beside Content.
_Avoid_: Theme (the Theme is the whole Site's), design, appearance, overrides

**Container**:
A Block that holds other Blocks, as a stack or as columns side by side, and says where they sit across: at the start, in the centre or at the end. A Container can hold Containers, three levels deep. A Block inside one is the same Block as on the Page, drawn without its own full-width band. A Layout's Header and Footer take Containers too, holding that region's own Blocks: a Header's Container never holds a Footer's Block.
_Avoid_: Section, row, grid (as model names), wrapper, group

**Guest feedback survey**:
A Block that asks a guest how their stay was, out of five stars. A high rating is asked for a public review; a lower one gets a feedback form, and what the guest writes is passed to the guest care team. The Site keeps none of it.
_Avoid_: Review form, NPS, rating widget, feedback Block

**Media**:
An image uploaded by Users for use on Pages, Layouts, the Brand and SEO.
_Avoid_: Asset, file, upload (as model names)

**Draft** / **Published**:
The lifecycle of a Page. Users edit the Draft, and visitors see only the Published version until the Draft is published.
_Avoid_: Staging, live copy, unpublished

**Rental**:
A vacation property that visitors can book, shown on the Site in Blocks such as Featured rentals.
_Avoid_: Property, listing, unit

### Editing

**Admin**:
The place Users sign in to manage Pages, Layouts, Media, the Brand, SEO and the Theme.
_Avoid_: Back office, CMS (for the admin itself)

**Dashboard**:
The Admin's home page: the Site at a glance and the way into recent work.
_Avoid_: Home (for the Admin page), overview

**Assets**:
The Admin's grouping, under Settings, for the files the Theme draws on. Today that is Fonts. It is a heading in the Admin, not a model: Media is Content, not an Asset.
_Avoid_: Assets for Media, or as a model name

**Tools**:
The Admin's grouping, below Settings, for jobs that act on the whole Site at once, such as Replace Text, Replace Image and Links, and for the lists a Site draws on: Themes and Starter Kits. It is a heading in the Admin, not a model.
_Avoid_: Utilities, system tools, other

**Replace Text** / **Replace Image**:
Tools that change one text, or one Media image, everywhere the Site shows it. Each shows what it would change first, and leaves Page Templates as they are unless asked to include them. Pages are saved as Drafts or published, as the User chooses; Layouts, the Brand and SEO have no Drafts, so they change on the Site at once.
_Avoid_: Find and replace, search and replace, bulk edit

**Links**:
A Tool that lists every link on the Site's Pages and Layouts, one row per place a link leads, with where it is used. A link to a path no Page has, or to a Page that is not published, is a broken link. A URL can be replaced everywhere it is used, as Replace Text replaces words.
_Avoid_: Link checker (links that leave the Site are not checked), redirects, URLs (for the Tool)

**Visual Editor**:
The part of the Admin where a User edits a Page or a Layout on the rendered page itself (clicking a Block or its text to change it, adding or reordering Blocks) and edits the Theme while seeing it on real Pages.
_Avoid_: Page builder, live preview, inline editing (as the feature name)

### People

**User**:
A person who signs into the Admin with their Awayday Microsoft account. Every User can do everything in the Admin. Visitors never sign in.
_Avoid_: Staff (the old name), Admin (for a person), editor, account, member
