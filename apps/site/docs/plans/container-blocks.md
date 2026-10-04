# Container Blocks milestone: spec and Definition of Done

Staff can put Blocks side by side and group them: a **Container** Block holds other Blocks as a stack or a grid, up to three levels deep (ADR-0007).

- **Before building, read:**
  - `GLOSSARY-MAP.md` and `apps/site/GLOSSARY.md` (Container, Block)
  - `apps/site/docs/adr/0007-container-blocks-nest-three-levels-written-out.md`
  - `apps/site/docs/plans/container-blocks-spike.md`
  - `node_modules/next/dist/docs/`, because this Next.js version has breaking changes
- **Branches:**
  - integration branch: `milestone/container-blocks`, off `development`
  - slices: `wip/cb-<phase>-<slice>`, landed onto the integration branch
- **Phases 0 and 1 are done:** the ADR, this spec, the glossary entry and the spike.

## Standing rules

- **Never touch** the `property_management_site` database or `main`. Use scratch databases or schemas (`pm_test_*`, `ms_<something>`) and drop them.
- **A running dev server pushes schema changes** from the working tree into its database and can stop to ask before dropping a column. Build schema slices in a worktree, or with the dev server stopped.
- **Test-first.** Every slice keeps `pnpm check` green. A slice that changes a migration regenerates it with `DATABASE_SCHEMA` unset and runs `pnpm --filter site genericize` on it.
- **Admin writes go through the Local API as the Staff User** (ADR-0002). A Block renders the same on the Site and in the Visual Editor.
- **Styling comes from the Theme's tokens.** WCAG 2.2 AA on the Site and in the Admin.
- **Decisions the spec doesn't cover:** make the most conservative choice consistent with ADR-0007 and report it for the PR body.

## The Container

- **Fields:** layout is a number of columns, 1 to 4 (1 is a stack); gap (Small / Medium / Large); vertical alignment of cells (Top / Centre / Stretch); width (Page / Reading); background (the four surfaces Blocks have); children.
- **Children:** any Page Block the level allows, in order. In a grid each child is one cell; a cell that needs several Blocks is a Container.
- **Depth:** a Container at level 1 or 2 may hold Containers; at level 3 it may not. Same `blockType` (`container`) at every level.
- **Phones:** columns collapse to one below the `sm` container width; 3 and 4 columns go through 2 first.
- **Empty:** a Container with no children renders nothing on the Site, and a placeholder with "Add a Block" in the Visual Editor.

## New small Blocks

- **Button:** label, link (the shared link group and its validation), style (Primary / Accent / Outline), alignment (Start / Centre / End). Usable at the top level too.
- **Image:** a Media image, alt from Media, optional caption, aspect (Original / 16:9 / 4:3 / 1:1), rounded by the Theme's card radius. Counts as a use of the Media.

## Phase 2: schema and Site

- **2.1 Container in the config.** Three written-out levels, one slug; pinned table names; migration; generated types. _Done when:_ a three-level tree saves, reads back and survives a Draft, in a test; a fourth level and a Block a level doesn't allow are refused with a message, not dropped.
- **2.2 Embedded rendering.** The Container component (grid, gap, alignment, width, background); the subtree mark; `BlockSection` and `HeroShell` drop their own background, vertical padding and page-width box under it; the Container's background sets the colours children read. _Done when:_ each Block's sample renders inside a one-column Container with no horizontal overflow and no doubled padding (render tests), and a link and a button pass AA on each of the four backgrounds.
- **2.3 Ids and context.** A Block's ids come from its path (`block-1-0-2-heading`), unique at any depth; "first on the Page" stays true only for the first top-level Block. _Done when:_ a Page with the same Block at three depths has no duplicate ids (axe).
- **2.4 Button and Image Blocks**, with catalogue entries, samples and thumbnails.
- **2.5 Catalogue fit.** Each entry says whether it fits a narrow column. Start: Rich text, Button, Image, Call to action, Container. _Done when:_ validation refuses a full-width-only Block in a Container of two or more columns.
- **2.6 Walkers.** "Pages linking here" reads Buttons and children at any depth; Media-in-use names the nested place ("Block 2, Container, Column 1, Image").
- **Shippable result:** Containers render on the public Site and can be edited in Payload's admin (`/p-admin`).

## Phase 3: editor core

- **3.1 Tree state.** Every Block at every depth has an id; find, insert, move, duplicate, remove and undo work by id anywhere in the tree; depth and fit are checked on insert and move.
- **3.2 Block tab.** Selecting a child shows its fields; selecting a Container shows its own.
- **3.3 Picker.** Adding inside a Container offers only what fits there and, at level 3, no Container.
- **3.4 Save problems** name a nested Block by its place.
- **Shippable result:** children can be added, edited and removed from the Admin, through the outline's buttons.

## Phase 4: outline and the Tuck-in starter

- **4.1 Outline tree.** Containers expand and collapse; children are indented; keyboard reachable.
- **4.2 Drag and drop** within a Container, between Containers, and in and out, refused where depth or fit forbid it, with the reason.
- **4.3 Tuck-in starter** rebuilt as Container → Rich text + Button, twice. The seed tests change with it.
- **Shippable result:** the feature is usable day to day.

## Phase 5: canvas

- **5.1 Nested frames and selection.** A click selects the innermost Block; the label shows the path; Escape goes up one level.
- **5.2 Add inside.** Plus buttons between children and in an empty Container.
- **5.3 In-place text** for children, including Rich text.
- **Shippable result:** the Visual Editor does everything for nested Blocks that it does for top-level ones.

## Phase 6: narrow fit (open-ended)

Convert Blocks from viewport breakpoints to container queries, a few per slice, each with a screenshot at one-half and one-third width, and mark them as fitting. Order: Features, Stats, Image + text, Steps, Amenities, FAQ, Newsletter, Form. Search Hero, Rental grid and the Testimonials carousel stay full width only.

## Phase 7: audit and PR

- All e2e suites, including `e2e/6-seed-sites`.
- Accessibility: nested regions and their names, the outline tree with a keyboard and a screen reader, focus order in a grid.
- A review of the whole branch, then one PR to `development` with "Decisions made during the build".

## Definition of Done for the milestone

- A Staff User builds the Tuck-in page from the starter and a two-column page with cards, in the Visual Editor alone.
- Nothing a Staff User builds can be silently dropped on save.
- `pnpm check` and the e2e suites pass; the seeded Sites migrate and seed cleanly.
