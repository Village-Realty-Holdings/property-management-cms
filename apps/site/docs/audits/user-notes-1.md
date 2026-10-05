# User notes after the Phase 3–6 build (30 Sep 2026)

Observations from trying the three seeded Sites before Audit 1. Each one becomes a slice in iteration 1, alongside the audit's findings.

1. **Tables have no sort or filter.** The Admin lists (Pages, Layouts, Media, Fonts, the SEO "Pages needing attention" table) need column sorting and filtering, on top of the existing search.
2. **Images can't be uploaded from the Visual Editor.** Picking an image for a Block should let the User upload a new file without leaving the editor.
3. **The image picker is a plain select.** Choosing Media by name from a dropdown is poor UX for images.
4. **A picked image doesn't render live.** Selecting an image for the Hero did not update the canvas until later. The spec's "instant preview" rule applies to image fields too.
5. **Expected pattern for 2–4:** a conventional media field that shows the current image as a thumbnail and opens a dialog with a grid of Media files (search, thumbnails) plus an Upload action; choosing one updates the canvas immediately.
6. **The "Add a Block" dialog is too small.** The picker should be larger, with bigger thumbnails and grouping, so a Block can be recognised and chosen at a glance.
7. **The Visual Editor scrolls past its end into a white screen.** Scrolling down in the editor goes beyond the canvas and shell into blank white. The editor shell should fill the viewport and own its scrolling (the canvas iframe scrolls; the page around it does not).
