export const meta = {
  name: "site-builder",
  description:
    "Site Builder milestone, slice by slice: acceptance tests first, small slices merged continuously into milestone/site-builder, then audit and improvement iterations",
  whenToUse:
    "Site Builder milestone (map #34), phases 3–7 and iterations. args (all optional): { phases: [3,4,5,6], iterations: 3 } — see apps/site/docs/plans/site-builder-milestone.md runbook.",
  phases: [
    {
      title: "Plan",
      detail: "cut the remaining phases into small slices with dependencies",
      model: "opus",
    },
    {
      title: "Acceptance",
      detail: "browser acceptance suite per phase, written from the spec first",
      model: "opus",
    },
    {
      title: "Build",
      detail:
        "each slice: Sonnet coder in a worktree, Opus diff review, land on the milestone branch",
    },
    {
      title: "Stabilise",
      detail: "pnpm check and the whole acceptance suite green on the branch",
    },
    {
      title: "Audit",
      detail: "Opus audit of the three running Sites",
      model: "opus",
    },
    {
      title: "Iterate",
      detail: "audit findings become slices, then a fresh audit",
    },
    { title: "Ship", detail: "final PR into development, left open" },
  ],
}

const SPEC = "apps/site/docs/plans/site-builder-milestone.md"
const BASE = "milestone/site-builder"
const PHASES = args?.phases ?? [3, 4, 5, 6]
const ITERATIONS = args?.iterations ?? 3
const CODER = { model: "sonnet", effort: "high" }

const RULES = `Repo: /home/al/Projects/Awayday/property-management-cms (app apps/site). Spec: ${SPEC} on branch ${BASE} — read "Standing rules" and the sections you are pointed at, plus apps/site/GLOSSARY.md and apps/site/docs/adr/. Never touch the property_management_site database or main. Use the scratch Postgres database "pm_milestone" (create if missing) with a DATABASE_SCHEMA named ms_<your-key>, and drop that schema when done.
Be economical with heavy commands: while iterating run only the vitest files you touch; run \`pnpm check\` once before you push; run browser tests (\`pnpm --filter site test:e2e <files>\`, env in apps/site/e2e/theme/support/env.ts) only for the files named in your task. In a fresh worktree use \`pnpm install --prefer-offline\`.`

// The test suite starts Payload and a database per file, so full runs starve
// each other when many worktrees run them at once. Coders run only what they
// touched; the full check happens once per slice, when it lands.
const FAST = `${RULES}
Checks while you build, and before you push: run ONLY the vitest files you added or changed and the ones that import what you changed (\`pnpm --filter site exec vitest run <files>\`), \`pnpm --filter site typecheck\`, and eslint on the files you changed (\`pnpm --filter site exec eslint <files>\`). Do NOT run \`pnpm check\`, \`pnpm test\`, \`turbo\` or the whole vitest suite: many coders share this machine and the land step runs the full check for you. This overrides the "pnpm check once before you push" line above.
If your wip branch already exists locally, or is checked out in another worktree under .claude/worktrees/, that is debris from a cancelled attempt at this same slice, not a live coder: nothing else is building your slice. Remove that worktree (\`git worktree remove --force <path>\`), delete the local branch, and carry on from origin/${BASE}.`
// Slices built before FAST existed keep their original prompt, so a resumed
// run reuses their results instead of building them again.
const BUILT_WITH_FULL_CHECK = new Set([
  "page-blocks-rename",
  "region-block-schemas",
  "layout-resolution",
  "ui-components",
  "editor-state",
])

// Reviewed and landed before the run was resumed. The resume cache is keyed by
// call order, so these skip their review and land calls instead of repeating them.
const ALREADY_LANDED = {
  "page-blocks-rename": {
    commit: "ec1d9a29021ee57071ebf99b2a3d9a59ec48f451",
    backlog: [
      "Verification gap: the coder never got one fully green `pnpm check` (site#test timed out while the machine was under heavy load, though the files passed when rerun alone). Run `pnpm check` once on the integrated branch before the checkpoint PR.",
      "No migration file: I accept this. Payload's Postgres block tables (pages_blocks_*, _pages_v_blocks_*) are named from the block slug, and `migrate:create` found no schema changes, so a blank migration would only be noise. The Phase 3 slice that adds the new `layout` field must generate the real migration and genericize it. Say so in the checkpoint PR so the missing migration in this first chain slice isn't read as a gap.",
      "Existing dev and staging rows keep `_path = 'layout'` in pages_blocks_* and _pages_v_blocks_*, so their Pages will read back with no Blocks after this merges. This follows the spec ('No data migration: seeds recreate content'), but the checkpoint PR or runbook should say local DBs need a reseed. If data is ever kept, a one-line UPDATE of `_path` from 'layout' to 'blocks' on those tables would fix it.",
      "Admin form error paths moved from `layout.N.*` to `blocks.N.*`. PageEditor and its tests are consistent. Any later Phase 3 or Phase 5 code that builds Block error paths by hand (for example the visual editor) should use `blocks.`, not `layout.`.",
      "The dashboard's PagesRow `layout` field ('No Layout') is correctly left alone because it is the Layout choice, not Blocks. Rows are now easy to confuse with the coming Page `layout` field, so name things clearly when that slice wires it.",
    ],
  },
  "region-block-schemas": {
    commit: "18cda86",
    backlog: [
      "pnpm check is not confirmed green. The coder saw timeouts in src/migrations.acceptance.test.ts and scripts/check-migrations.test.ts and never ran full lint. The diff touches no migrations or registered config, so the timeouts are probably environmental. The integrator should still run `pnpm check` on the merged phase branch before the checkpoint.",
      "src/fields/navLink.ts: when `type` is switched from page to url, the hidden `page` relationship stays stored. Items whose link is hidden because they have dropdown children keep a stale `link` too. When the slice lands the spec rule 'deleting a Page that a menu links to is blocked', these stale relations would block deletes wrongly. Clear the unused branch in a beforeChange hook, or have the reference check look only at type === 'page' on items that have no children.",
      "Navigation children use a free-text `column` heading to group mega-menu links. Headings that differ only by typo or case split into separate columns, and `column` shows even when display is 'dropdown'. If this causes confusion, add a condition on the parent's display or switch to explicit column groups. The renderer slice decides.",
      "When these Blocks are registered on Layouts (header + footer blocks fields, plus versions), check the Postgres identifier lengths. For example `enum__layouts_v_blocks_navigation_items_children_link_type` is about 58 chars, close to the 63 limit. Add dbName where needed.",
      "LegalBar {year}/{name} token replacement, the Brand fallbacks (phone, address, social, logo, tagline) and the visual-only Newsletter form all fall to the renderer slice. Make sure its tests cover the empty-override fallbacks.",
    ],
  },
  "layout-resolution": {
    commit: "d26427752948e7a0e1ceb7d23ac18bac477cf30d",
    backlog: [
      "apps/site/src/layouts/resolve.ts resolveLayout: when a Page's specific Layout has been deleted, the resolution silently reports reason 'path'/'default', so the Pages list cannot show that the Page's choice is stale. Consider a flag (e.g. `fellBack: true`) so the admin UI can surface it, or clear the choice when a Layout is deleted.",
      "apps/site/src/layouts/resolve.ts layoutLabel: 'No Layout' is shown both when the editor picked No Layout and when nothing resolves because no default Layout exists. These are different situations for an editor. Consider a distinct label such as 'No Layout (no default set)'.",
      "apps/site/src/layouts/resolve.ts: equal-length prefixes are decided by input order, and several defaults resolve to the first. The Layouts collection slice should validate that path prefixes are unique across Layouts (after normalising) and that only one Layout is default, so order never matters.",
      "apps/site/src/layouts/resolve.ts normalizePath: it trims only the whole string, so a prefix like '/stays /x' keeps inner whitespace. It also does not strip query strings or fragments. Callers should pass clean pathnames, and the Layouts collection should validate the prefixes it saves.",
      "apps/site/src/layouts/resolve.test.ts: the 'specific' label test uses a non-default Layout. Add one where the specific Layout is also the default and check the label is still the bare name, not 'Main (default)'.",
    ],
  },
  "ui-components": {
    commit: "5127d44e0992d0a20e29391dd4394b92383d343f",
    backlog: [
      "dialog.tsx: DialogContent has `rounded-(--card-radius)` but no `shadow-(--card-shadow)`, while popover and dropdown-menu have both. The coder's note says every panel reads --card-shadow. Add it so a Theme's card shadow reaches dialogs (the Block picker and the Ctrl-K palette) too.",
      "Motion-reduce fallbacks are uneven. The dialog, popover, dropdown and tooltip animate-in/out classes rely only on `duration-(--duration)`, with no `motion-reduce:animate-none`, while the accordion and tabs have one. Check that --duration resolves to 0 under prefers-reduced-motion, or add motion-reduce:animate-none to match.",
      "carousel.tsx: the effect registers `reInit` and `select` listeners but its cleanup only removes `select`, so the `reInit` handler leaks when the api changes. This is inherited from upstream shadcn. Also off('reInit', onSelect).",
      "carousel.tsx: the controls sit at `-left-12` / `-right-12`, outside the carousel box, so they can overflow or be clipped at phone width. Revisit when the Featured rentals and Testimonials Blocks use the carousel.",
      "command.tsx: CommandDialog renders its sr-only DialogHeader (Title and Description) outside DialogContent, so the header sits outside the portal, inline wherever the dialog is rendered. The aria wiring still works through Root context. For cleaner DOM, move the header inside DialogContent.",
      "checkbox.tsx uses `rounded-[min(var(--input-radius),4px)]`, so a Pill Theme is capped at 4px on checkboxes. That is probably intended; confirm with the Theme controls UX.",
      "radio-group.tsx and scroll-area.tsx keep shadcn defaults: rounded-full is inherent to both, and scroll-area's `transition-[color,box-shadow]` has no --duration. Minor token pass later.",
      "Adding @dnd-kit/core 6.3.1, @dnd-kit/sortable 10.0.0 and @dnd-kit/utilities was fine: the lockfile already had these versions through Payload, so they dedupe. cmdk brings in @radix-ui/react-dialog as a transitive dependency next to Base UI. That is acceptable, but note it for bundle size.",
      "The coder did not re-run the full `pnpm check` after the destructive-text fix and did not re-run check-migrations alone. The orchestrator should confirm a green `pnpm check` before the checkpoint.",
    ],
  },
  "editor-state": {
    commit: "e77fe2547b6d89f7decd44600c22760753c6491f",
    backlog: [
      "state.ts setField: it accepts paths such as `blocks.0.id`, `header` or `blocks`. These can change a Block id or replace a whole region, which bypasses id assignment (ensureIds/withFreshId) and can give duplicate or missing ids. Consider refusing `id` segments and whole-region paths, or running ensureIds after such a set.",
      "state.ts setField coalescing: if a typing run ends on the value it started from (type 'a' then Backspace), the step stays on the undo stack as a no-op undo. Consider dropping the step when the coalesced doc equals past.at(-1).",
      "EditorProvider.tsx: the api object, and every action callback in it, is rebuilt on each state change, so any consumer that only dispatches still re-renders on every keystroke. Consider a separate stable actions context, or memoising the callbacks on dispatch only.",
      "The save slice must verify that Payload (Postgres blocks tables) accepts client-made `new-N` string ids on block rows, and keeps them. If the server swaps ids, markSaved drops the selection and the undo history keeps the old ids.",
      "LayoutDocument header and footer are BlockValues[] and need widening when the Layout and Phase 4 blocks land on the milestone branch.",
      "withFreshId scans all past and future documents (up to 100 plus) on every insert or duplicate. That is fine now, but could be replaced by the monotonic counter plus current-doc ids, since ids from the history can only come back through undo or redo, which never mints new ids.",
    ],
  },
}

// At most 3 slices land at a time: landing is where the full check runs.
let lanes = 3
const queue = []
async function withLane(fn) {
  if (lanes > 0) lanes--
  else await new Promise((go) => queue.push(go))
  try {
    return await fn()
  } finally {
    const next = queue.shift()
    if (next) next()
    else lanes++
  }
}

const LAND = `To land on ${BASE}: git fetch, rebase onto origin/${BASE}, squash to one conventional commit, re-run pnpm check if the rebase pulled in changes, then \`git push origin HEAD:${BASE}\`. If the push is rejected as non-fast-forward, fetch, rebase and push again (up to 5 tries). On a conflict in src/migrations or generated Payload types, take theirs and regenerate (pnpm generate, the single schema-agnostic migration) rather than hand-merging. If the branch refuses direct pushes, open a PR and \`gh pr merge --squash\` instead.`

const SLICE = {
  type: "object",
  properties: {
    key: { type: "string", description: "kebab-case, unique" },
    phase: { type: "string", description: "spec phase number, e.g. 4" },
    title: { type: "string" },
    brief: {
      type: "string",
      description:
        "what to build, the exact spec text it covers, the files/areas it owns",
    },
    accept: {
      type: "string",
      description:
        "one concrete check that proves the slice works (a named test or acceptance file)",
    },
    after: {
      type: "array",
      items: { type: "string" },
      description:
        "keys of slices that must land first. Keep this minimal: only real code dependencies.",
    },
  },
  required: ["key", "phase", "title", "brief", "accept", "after"],
}
const SLICES = {
  type: "object",
  properties: {
    slices: { type: "array", items: SLICE },
    dropped: { type: "array", items: { type: "string" } },
  },
  required: ["slices"],
}
const BUILT = {
  type: "object",
  properties: {
    built: { type: "boolean", description: "false if you could not finish" },
    branch: { type: "string" },
    summary: { type: "string" },
    decisions: {
      type: "array",
      items: { type: "string" },
      description:
        "product decisions the spec does not settle, and the conservative choice you made",
    },
  },
  required: ["built", "branch", "summary", "decisions"],
}
const REVIEW = {
  type: "object",
  properties: {
    blocking: {
      type: "array",
      items: { type: "string" },
      description: "each: where, what is wrong, what to do",
    },
    backlog: { type: "array", items: { type: "string" } },
  },
  required: ["blocking", "backlog"],
}
const LANDED = {
  type: "object",
  properties: {
    landed: { type: "boolean" },
    commit: { type: "string" },
    note: { type: "string" },
  },
  required: ["landed"],
}

const decisions = []
const backlog = []

// Run slices as a dependency graph: a slice starts the moment everything in
// its `after` has landed. No waves, no barrier.
// `gates` maps a phase to a promise the phase's slices wait for (its
// acceptance suite); phases without one start at once.
async function buildSlices(slices, tag, gates = {}) {
  const byKey = Object.fromEntries(slices.map((s) => [s.key, s]))
  for (const s of slices)
    s.after = (s.after ?? []).filter((k) => byKey[k] && k !== s.key)
  // break cycles: anything that can't be ordered loses its deps
  const ordered = new Set()
  for (let moved = true; moved; ) {
    moved = false
    for (const s of slices)
      if (!ordered.has(s.key) && s.after.every((k) => ordered.has(k))) {
        ordered.add(s.key)
        moved = true
      }
  }
  for (const s of slices)
    if (!ordered.has(s.key)) {
      log(`${s.key}: dependency cycle, building without waiting`)
      s.after = []
    }

  const running = {}
  const one = async (s) => {
    await gates[s.phase]
    const deps = await Promise.all(s.after.map((k) => run(byKey[k])))
    const missing = s.after.filter((k, i) => !deps[i]?.landed)
    const wip = `wip/${tag}-${s.key}`
    const built = await agent(
      `${BUILT_WITH_FULL_CHECK.has(s.key) ? RULES : FAST}\n\nSlice "${s.title}" (key ${s.key}, Phase ${s.phase}).\n${s.brief}\n\nDone when: ${s.accept}\n${missing.length ? `\nThese slices you depend on did not land: ${missing.join(", ")}. Build what you need from them yourself, minimally.\n` : ""}\nIn your worktree: git fetch, create ${wip} from origin/${BASE}. Build it test-first (/tdd for logic). The browser acceptance files for your phase are under apps/site/e2e/${s.phase}-*/ and were written before the code: make the ones your slice covers pass. You may fix their selectors to match the real UI, but never weaken what they assert. ${BUILT_WITH_FULL_CHECK.has(s.key) ? "Run pnpm check" : "Run the checks named above"}, commit (conventional commits) and push ${wip}. Do not merge. Where the spec leaves a product decision open, make the most conservative choice consistent with the spec and ADRs and list it in "decisions".`,
      {
        label: `build ${s.key}`,
        phase: "Build",
        isolation: "worktree",
        schema: BUILT,
        ...CODER,
      }
    )
    if (!built?.built) {
      log(`${s.key}: not built`)
      return { key: s.key, landed: false }
    }
    if (ALREADY_LANDED[s.key]) {
      backlog.push(
        ...ALREADY_LANDED[s.key].backlog.map((x) => `[${s.key}] ${x}`)
      )
      decisions.push(...built.decisions.map((d) => `[${s.key}] ${d}`))
      return { key: s.key, landed: true, commit: ALREADY_LANDED[s.key].commit }
    }
    const review = await agent(
      `${RULES}\n\nReview one slice, from the diff only: \`git fetch && git diff origin/${BASE}...origin/${built.branch}\`. Do not run the app or the test suites. Slice "${s.title}" (Phase ${s.phase}): ${s.brief}\nDone when: ${s.accept}\nCoder's summary: ${built.summary}\n\nBlocking = bugs, a missed part of the slice's spec text, security or data-loss risk, an ADR or standing-rule violation, an acceptance test whose assertion was weakened, or one of these coder decisions being wrong for the product (say what to do instead):\n${built.decisions.map((d) => `- ${d}`).join("\n") || "- none"}\nEverything else goes in "backlog". The whole build gets a full audit later, so keep blocking to what must not merge.`,
      {
        label: `review ${s.key}`,
        phase: "Build",
        model: "opus",
        effort: "medium",
        schema: REVIEW,
      }
    )
    backlog.push(...(review?.backlog ?? []).map((b) => `[${s.key}] ${b}`))
    decisions.push(...built.decisions.map((d) => `[${s.key}] ${d}`))
    const blocking = review?.blocking ?? []
    const landed = await withLane(() =>
      agent(
        `${RULES}\n\nLand slice ${s.key}. In your worktree check out origin/${built.branch}.${blocking.length ? ` First fix these review findings, test-first where it is logic:\n${blocking.map((b) => `- ${b}`).join("\n")}\n` : ""} ${LAND} The coder ran only the tests for the files it touched, so after the rebase always run \`pnpm check\` once, in the foreground, before you push: it takes several minutes, so give that command a 10 minute timeout and do not start it twice. Then delete ${built.branch} from origin, and remove any other worktree under .claude/worktrees/ that has ${built.branch} checked out (\`git worktree remove --force\`) along with the local branch. Return the landed commit.`,
        {
          label: `land ${s.key}`,
          phase: "Build",
          isolation: "worktree",
          schema: LANDED,
          ...CODER,
        }
      )
    )
    if (!landed?.landed)
      log(`${s.key}: did not land (${landed?.note ?? "agent failed"})`)
    return { key: s.key, landed: !!landed?.landed, commit: landed?.commit }
  }
  const run = (s) =>
    (running[s.key] ??= one(s).catch(() => ({ key: s.key, landed: false })))
  const results = await Promise.all(slices.map(run))
  log(
    `${tag}: ${results.filter((r) => r.landed).length}/${slices.length} slices landed`
  )
  return results
}

async function stabilise(tag) {
  let stillRed = []
  for (let round = 0; round < 3; round++) {
    const r = await agent(
      `${RULES}\n\nStabilise origin/${BASE} (${tag}, round ${round}). In your worktree on a branch from origin/${BASE}: run pnpm install, pnpm check, the migration check and the whole browser suite (\`pnpm --filter site test:e2e\`). Fix whatever is red in the code, not by weakening tests. A test for something the spec lists as out of scope may be removed; say so. ${LAND} Return green=true only if everything passed on the commit you landed (or nothing needed fixing).`,
      {
        label: `stabilise ${tag} r${round}`,
        phase: "Stabilise",
        isolation: "worktree",
        schema: {
          type: "object",
          properties: {
            green: { type: "boolean" },
            stillRed: { type: "array", items: { type: "string" } },
          },
          required: ["green", "stillRed"],
        },
        ...CODER,
      }
    )
    if (r?.green) return []
    stillRed = r?.stillRed ?? ["stabilise agent failed"]
  }
  log(`${tag}: still red after 3 rounds: ${stillRed.join("; ")}`)
  return stillRed
}

const audit = (n) =>
  agent(
    `${RULES}\n\nAudit ${n === 1 ? "the completed build" : `the milestone after iteration ${n - 1}`} (origin/${BASE}), spec section "Phase 7: Audit". Set up and run all three Sites (pnpm sites:worktrees, pnpm site <slug> seed, pnpm site <slug> dev on ports 3001–3003), sign in via /auth/dev, and drive the Admin, the Visual Editor and the public Site with headless Chromium (playwright-core; Chromium at ~/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome). Audit: design and UX (Staff Users are not designers), code quality against AGENTS.md and the ADRs, WCAG 2.2 AA, performance of the Home pages, fidelity of Warren Beach and Avada to research/brands/*/screenshots (recognisable, not pixel-perfect) and of Beachside to its brand, and every "Acceptance for phase" item in the spec. ${n > 1 ? `Also check whether the findings audit-${n - 1} raised are really fixed.` : ""} Slices were only diff-reviewed, so this is the first look at the whole thing running: be thorough. Write apps/site/docs/audits/audit-${n}.md with findings ranked by impact (each: title, evidence, where, suggested fix, effort), with key screenshots under apps/site/docs/screenshots/audit-${n}/. ${LAND} Return the ranked top 15 titles.`,
    {
      label: `audit-${n}`,
      phase: "Audit",
      model: "opus",
      effort: "high",
      isolation: "worktree",
      schema: {
        type: "object",
        properties: { top: { type: "array", items: { type: "string" } } },
        required: ["top"],
      },
    }
  )

// ── Plan the slices and write the acceptance suite, side by side ──
// Each phase's slices wait only for that phase's suite, not for all of them.
const PLAN = () =>
  agent(
    `${RULES}\n\nYou are the lead. Read the spec sections for Phases ${PHASES.join(", ")} and the code on origin/${BASE}. Cut ALL of that work into small vertical slices: one screen, one Block, one behaviour, one seed. Aim for slices a coder finishes in about 10 minutes; expect 25–40. Each brief must quote the spec text it covers and name the files or areas it owns, so that two slices never own the same file unless one is "after" the other. List in "after" only real code dependencies; most Blocks, for instance, depend on nothing. Chain through "after" any slices that change the Payload schema or the migration, so they never run side by side. Where several slices need a shared seam (a Block registry, the editor shell, the fixtures shape), make that seam its own small early slice. Every acceptance item in those phases must be covered by some slice.`,
    {
      label: "plan slices",
      phase: "Plan",
      model: "opus",
      effort: "high",
      schema: SLICES,
    }
  )
const planning = PLAN()
const gates = Object.fromEntries(
  PHASES.map((p) => [
    String(p),
    agent(
      `${RULES}\n\nWrite the browser acceptance suite for Phase ${p} before any of it is built. In your worktree, on a branch from origin/${BASE}, add apps/site/e2e/${p}-<slug>/*.e2e.ts following the patterns and support helpers in apps/site/e2e/theme/. Cover every item under "Acceptance for phase ${p}" and the phase's UX rules, including an axe WCAG 2.2 AA check on each new screen. Drive everything through the browser and HTTP only: import nothing from code that does not exist yet, and select by role, label and the names the spec uses. The tests will be red for now; they sit outside pnpm check, which must stay green (lint and typecheck included). ${LAND} Return the files and what each covers.`,
      {
        label: `acceptance ${p}`,
        phase: "Acceptance",
        model: "opus",
        effort: "high",
        isolation: "worktree",
      }
    ).catch(() => null),
  ])
)
const plan = await planning
if (!plan?.slices?.length) throw new Error("planner returned no slices")
log(`${plan.slices.length} slices planned for phases ${PHASES.join(", ")}`)

// ── Build ──
const built = await buildSlices(plan.slices, "p", gates)
await Promise.all(Object.values(gates))
const carried = built.filter((r) => !r.landed).map((r) => r.key)
const red = await stabilise("build")

// ── Audit, then iterate ──
let top = (await audit(1))?.top ?? []
const iterations = []
for (let i = 1; i <= ITERATIONS; i++) {
  const triage = await agent(
    `${RULES}\n\nRead apps/site/docs/audits/audit-${i}.md on origin/${BASE}. Turn its top 10–15 findings by impact into slices for coding agents (skip anything the spec puts out of scope, and say which in "dropped"). One finding or one tight group per slice, with the finding text in the brief and a concrete check in "accept". Prefix keys with i${i}-. Use "after" only where two slices touch the same files. Use phase "i${i}".${i === 1 && carried.length ? ` Also add slices for this earlier work that failed to land: ${carried.join(", ")}.` : ""}`,
    {
      label: `triage audit-${i}`,
      phase: "Iterate",
      model: "opus",
      effort: "high",
      schema: SLICES,
    }
  )
  if (triage?.dropped?.length)
    log(`audit-${i}: dropped ${triage.dropped.join("; ")}`)
  const res = await buildSlices(triage?.slices ?? [], `i${i}`)
  const stillRed = await stabilise(`iteration ${i}`)
  top = (await audit(i + 1))?.top ?? []
  iterations.push({
    i,
    landed: res.filter((r) => r.landed).length,
    of: res.length,
    stillRed,
  })
}

// ── Ship ──
phase("Ship")
const pr = await agent(
  `${RULES}\n\nOpen the final PR from ${BASE} into development (use the /pr skill for the body) and leave it OPEN for the user to merge. Body: what each phase delivers, links to PRs #48 and #49 and to each audit (apps/site/docs/audits/), the Definition of Done checklist from the spec with each item's state, "Decisions made during the build":\n${decisions.map((d) => `- ${d}`).join("\n") || "- none"}\n"Not landed": ${carried.join(", ") || "none"}; "Still red": ${red.join("; ") || "nothing"}; latest audit's top findings: ${top.join("; ") || "none"}; backlog (first 40):\n${
    backlog
      .slice(0, 40)
      .map((b) => `- ${b}`)
      .join("\n") || "- none"
  }\nEnd the body with:\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\nReturn the PR URL only.`,
  { label: "final PR", ...CODER }
)
return { pr, slices: built, carried, red, iterations, decisions, backlog }
