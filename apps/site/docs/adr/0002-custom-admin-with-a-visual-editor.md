# The Admin is our own shadcn app with a Visual Editor, and Payload's admin is temporary

The Admin at `/admin` is our own UI, built with shadcn/ui on Payload's Local API. Its Visual Editor lets a User edit a Page on the rendered page itself. Payload's built-in admin moves to `/p-admin` as a working reference while the Admin is built, and is removed afterwards. We chose this because the editing experience is the point of the product, and Payload's admin is a generic form UI we can only customise at the edges.

## Considered Options

- **Customise Payload's admin** (the path apps/cms took, including the inline editing through the edit form drafted on the `payload-form-editor-snapshot` branch). Rejected. Every improvement has to fit Payload's form, nav and styling, and the page stays secondary to the form.
- **A better Block form with a live preview beside it.** Rejected in favour of editing on the page itself.

## Consequences

- The Admin writes through Payload's Local API as the signed-in User, never with access overridden. Validation, Drafts, versions and access rules stay in the Payload config and apply exactly as they did in Payload's admin.
- Blocks render the same way in the Visual Editor and on the public Site, so the Visual Editor needs no preview copy of the Site's views.
- `/p-admin` exists only until the Admin covers Pages, Layouts, Media, the Brand, SEO and the Theme. Nothing new is built for it.
- The Visual Editor's design (how edits are made, saved and shown) is its own decision, made when it is built.
