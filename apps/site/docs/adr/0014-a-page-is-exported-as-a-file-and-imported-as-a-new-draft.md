# A Page is exported as a file, and imported as a new Draft

Users want to move a Page from one Site to another, and to keep a copy of one outside the Site. The Pages list now has Export on each row and Import in its header.

**Export** downloads the Page as Users edit it (its newest copy) as one JSON file: title, path, Blocks, SEO, its Layout choice and whether it is a Page Template. What belongs to one Site is written by name, because an id means nothing on another: an image is its Media file name and alt text, and a Layout the Page picks is the Layout's name. The file carries no ids, no status and no dates.

**Import** adds the Page in a file as a **new Draft**. It never replaces a Page: when the path is taken the Page gets the next free one ("/about-2"), and the result says so. Images are looked up by file name in this Site's Media and the Layout by name; one the Site doesn't have is left out (the image field is empty, the Page uses the Layout for its path), and the result names each. A file that isn't a Page, holds a Block this Site doesn't have, or would not save is refused with the reason, and nothing is created.

## Considered Options

- **Put the image files in the export.** Rejected for now. A Page with a dozen photos would be a very large file, and the Site it goes to often has the brand's photos already. Uploading the missing ones and picking them again is the cost; the import says exactly which.
- **Import over an existing Page with the same path.** Rejected. A wrong file would replace a Published Page's Draft. A new Draft beside it can be compared, then one deleted.
- **Publish what was Published.** Rejected. A Page that arrives from elsewhere should be looked at before visitors see it.
- **Export every Page as one file.** Not built. It needs the Layouts, the menus that link Pages to each other, and the Media to be useful, which is a Site backup, not a Page export.

## Consequences

- Links between Pages are stored as paths in buttons and text, so they survive as written; a link to a Page the other Site doesn't have is a broken link there, which the Links Tool lists.
- Two Sites with different images under the same file name will show the wrong image after an import. File names from uploads are unlikely to collide, but nothing checks.
- A newer version of the file format must bump `awaydayPage`, since an older Site refuses anything else.
