# A Container Block nests Blocks, three levels deep, written out level by level

A Page's Blocks were one flat list, each a full-width section. Some Pages need Blocks side by side, or several Blocks sharing one band: a text with its button, a row of cards. We add one Block, the **Container**, that holds other Blocks as a stack or a grid of columns. A Container can hold Containers, to three levels. Any Block can go inside one, and the catalogue says which Blocks fit a narrow column. Two small Blocks come with it, Button and Image, because nothing existing is that small.

The nesting is written out in the config: the Container is defined three times, one per level, under the same `blockType`, and the third level takes no Container. We did this because Payload's Postgres schema builder (3.90.2) overflows the stack on a Block that contains itself, by reference or otherwise; the spike is in `docs/plans/container-blocks-spike.md`. Three written-out levels need nothing special from Payload, and the cap becomes part of the structure.

A Block inside a Container is the same component as at the top level. The Container marks its subtree, and the shared section wrappers (`BlockSection`, `HeroShell`) drop their full-width background, vertical padding and page-width box under that mark. No Block has a second rendering mode.

## Considered Options

- **A button on the Rich text Block.** Built, then dropped. It solved one layout and would have been followed by an image on Rich text, a second button, and so on.
- **A small set of inner pieces only** (text, button, image), with the existing Blocks top-level only. Rejected: Users would have two vocabularies, and "a Call to action beside a text" would be impossible.
- **A recursive Block with no depth limit.** Not possible on this Payload version, and not wanted: past three levels a Page is hard to read in the outline and hard to predict on a phone.
- **A separate Grid Block.** Rejected: a stack is a grid of one column, so one Block with a columns setting covers both.
- **One level only.** Rejected: a grid cell could hold a single Block, so "text with its button" in a column would be impossible.

## Consequences

- Payload silently drops a Block type a level doesn't allow (a fourth-level Container), so the Admin validates depth and fit before saving and says what is wrong.
- Blocks decide their layout from the viewport width today. Until a Block is converted to container queries it is "full width only" and the picker does not offer it in a column narrower than the page.
- A Container's background has to set the colours its children read (text, links, buttons), as a Block's own background does today.
- The Visual Editor's document becomes a tree: state, outline, canvas and the bridge address a Block by id at any depth, not by its place in one list.
- Each level's Container has its own table (`pages_blocks_container`, then `_2` and `_3`), and every other Block keeps its one table per collection: the row's `_path` says where it sits. Payload numbers the Container tables by nesting, so they don't move when a level's Blocks change; `dbName` can't pin them, because Payload keeps one table name per slug and the three levels would share the last one's. A test holds the names.
- Layout regions (Header, Footer) do not get Containers. (Reversed by ADR-0011: they take a Container of their own Blocks.)
