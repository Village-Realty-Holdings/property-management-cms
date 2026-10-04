# Container Blocks: spike findings (Phase 1)

A throwaway spike for ADR-0007, run on 2026-10-01 against Payload 3.90.2 and Postgres 17 in scratch `pm_test_*` databases. No spike code is kept; the screenshots are in `docs/screenshots/7-container-spike/`.

## Question 1: can a Block contain Blocks, three levels deep, in Payload with Postgres?

Four ways to declare it were tried, each with a Pages-like collection that has Drafts, the real Hero and Image + text Blocks, and a Button.

| Variant                                                                                                | Result                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Every Block in `config.blocks`, fields name them with `blockReferences`, the Container names itself | **Fails at start.** `buildConfig` accepts it; the Drizzle schema builder recurses without end (`traverseFields` → `buildTable`, "Maximum call stack size exceeded") |
| B. The Page's list inline, only the Container's children by reference                                  | **Fails at start**, the same way                                                                                                                                    |
| `blockReferences` with no recursion                                                                    | Works. Tables keep their `pages_blocks_<slug>` names                                                                                                                |
| C1. No references; the Container written out once per level, **same slug**                             | **Works**                                                                                                                                                           |
| C2. The same, with a slug per level (`container`, `containerL2`, `containerL3`)                        | **Works**                                                                                                                                                           |

What C1 and C2 showed:

- A Page with Hero, then Container → Container → Container → two Buttons, with other Blocks at each level, saves and reads back in order.
- A Draft saved on top of the Published version keeps the whole tree (the `_pages_v_*` tables mirror it).
- Each leaf Block keeps **one table** however deep it is used. The row's `_path` holds its place: `blocks.1.children`, `blocks.1.children.1.children.1.children`.
- The Container gets a table per level. With one slug Payload names them `pages_blocks_container`, `_2` and `_3`; with a slug per level, `container`, `container_l2`, `container_l3`.
- **A Block a level doesn't allow is dropped without an error.** A fourth-level Container was accepted and stored as an empty third-level one.

**Decision:** C1. One `blockType` at every level keeps rendering and the editor simple, and moving a Container between levels does not change what it is.

## Question 2: can the existing Blocks render inside a Container without a second mode each?

A prototype Container wrapped real Blocks (their catalogue samples) and marked its subtree with an attribute. Three CSS rules under that attribute removed the section wrappers' background, vertical padding and page-width box. No Block was changed.

- **Stack and two-column grid** (`1-stack-and-grid.png`): Rich text with a Button under it, and Rich text beside a Call to action, both look right. This is the Tuck-in section.
- **Three levels** (`3-three-levels.png`): a grid of two, a stack inside it, a grid of two Buttons inside that, with an FAQ beside it, on the dark surface. The layout holds.
- **Narrow columns** (`2-narrow-columns.png`): Features, Stats and Image + text in thirds are broken. Features keeps three columns inside its third, Stats' numbers overlap, Image + text collapses. They lay out by viewport width.
- **Colours** (`3-three-levels.png`): on the dark Container the Rich text's link stays the page's link colour and is hard to read. The wrappers set link and button colours per background today; under a Container that has to come from the Container.

## What the spike did not cover

- The Visual Editor: nothing there was touched.
- Whether Payload's table names for the three Container levels stay stable when a level's children change (Phase 2, first slice, should pin them with `dbName` if they don't).
- In-place rich text editing (Lexical in the canvas) for a Rich text inside a Container.
- Generated types for the three levels (each needs its own `interfaceName`, or none).
