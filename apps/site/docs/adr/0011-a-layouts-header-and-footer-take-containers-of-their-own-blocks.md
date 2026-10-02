# A Layout's Header and Footer take Containers of their own Blocks

ADR-0007 gave Pages the Container and left Layouts out: "Layout regions (Header, Footer) do not get Containers." A landing page then needed a centred logo in the Header, a coloured band across the Footer and a logo in that band, and each was going to be one more option on one more Block. A Header and a Footer now take the Container too. It holds that region's own Blocks, as a stack or as columns, three levels deep as on a Page (ADR-0007), with the same settings and drawn by the same classes.

Three things came with it, because the Container needed them to cover those cases:

- **A horizontal alignment** on every Container, on Pages and Layouts: start, centre or end. At the start a Block fills its cell, as it always did. In the centre or at the end it is as wide as what it holds: a logo, a button, an image.
- **The Logo goes in a Footer**, and has an Extra large size.
- **The Utility strip can show the Brand's phone number**, with a phone icon, at its start, and no longer needs a line of text.
- **The Brand has a Light logo.** A Logo in a Container on a Primary or Dark background shows it, when the Brand has one, and the Brand's logo otherwise. The Block does not choose: the surface it sits on does.

## How it is stored and checked

The Header and the Footer share one Container definition, holding every region Block but the Utility strip. Payload keeps one table per Block type for a collection, so two Containers with different Blocks under the one `blockType` would read and write each other's rows; one definition gives `layouts_blocks_container`, `_2` and `_3`. Which of those Blocks a region's Container may hold is then the region's rule, not the schema's: a Header holds the Header's Blocks and a Footer the Footer's (`regionHolds` in `src/blocks/region`). The Layout checks it on save and says which Block is wrong, where Payload used to drop a misplaced Block without a word, and the Visual Editor checks it before an insert or a move and offers a Container only what it can hold.

## How it is drawn

In a Footer, Blocks stack, and a Container is one more band. In a Header, Utility strips still stack above everything; after them the Blocks are read in order, a Container is a band of its own, and the Blocks between Containers share a row as before. A Header with no Container draws exactly as it did. A Header that ends in a row has a line under it, as before. A Container draws a line under its band only when its "Line below" setting says so, so a Header that ends in a Container has one or not as Staff choose.

A region Block inside a Container is drawn for the Container's surface: the Logo picks its image, links and the Legal bar's words take the band's text colour, and a Block that is a bar on the region (the Legal bar, Footer columns) gives up its own padding and rule.

## Considered Options

- **An alignment and a bigger size on the Logo Block only.** Rejected. It centres the logo and leaves the band and the Footer logo to two more options on two more Blocks.
- **A new background colour for bands.** Not needed. A Container's Primary background is the Theme's primary colour, and a Site that wants a lighter band than its buttons sets its buttons to the accent colour.
- **Any Page Block in a region's Container** (Rich text, Button, Image). Left out for now. A Header is on every Page: its Blocks are the few that know the Brand and the menu. It can be widened later by adding Blocks to the one list.
- **A Container per region in the schema**, each holding only its region's Blocks. Not possible under one `blockType` (see above), and a second `blockType` would be a second Block to explain.

## Consequences

- ADR-0007's last consequence no longer holds. The rest of it does, for Layouts as for Pages.
- A Utility strip never goes in a Container, and stays above the Header's bands whatever its place in the list.
- A Layout that was saved with a Block in the wrong region kept quiet about it before (the Block was dropped). Saving such a Layout now fails with the Block named.
- A Block added to a Header or a Footer later must decide how it draws on a Container's surface.
- One migration adds the three Container tables for Layouts and their versions, the alignment column on every Container table, the Logo's new size and the Brand's light logo.
