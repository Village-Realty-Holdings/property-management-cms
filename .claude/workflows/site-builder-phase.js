export const meta = {
  name: "site-builder-phase",
  description:
    "Build one Site Builder milestone phase: plan, parallel coders, integrate, Opus code + Fable UX review, fix loop, checkpoint PR merged into milestone/site-builder",
  whenToUse:
    "Site Builder milestone (map #34). args: { n, slug, title, items? } — see apps/site/docs/plans/site-builder-milestone.md runbook.",
  phases: [
    {
      title: "Plan",
      detail: "split the phase into work items and cut the checkpoint branch",
    },
    {
      title: "Build",
      detail: "Sonnet 5.5 coders in worktrees, wave by wave, then integrate",
    },
    {
      title: "Review",
      detail: "Opus code review and Fable UX review, up to 2 fix rounds",
      model: "opus",
    },
    {
      title: "Advise",
      detail: "Fable advisor answers questions the spec does not cover",
      model: "fable",
    },
    {
      title: "Ship",
      detail: "checkpoint PR into milestone/site-builder, merged",
    },
  ],
}

const SPEC = "apps/site/docs/plans/site-builder-milestone.md"
const BASE = "milestone/site-builder"
const { n, slug, title } = args
const branch = `checkpoint/${n}-${slug}`
const CODER = { model: "sonnet", effort: "high" }

const RULES = `Repo: /home/al/Projects/Awayday/property-management-cms (app apps/site). Spec: ${SPEC} on branch ${BASE} — read the "Standing rules" and your phase section first, plus GLOSSARY-MAP.md, apps/site/GLOSSARY.md, apps/site/docs/adr/. Never touch the property_management_site database or main; use a scratch Postgres database "pm_milestone" (create if missing) with DATABASE_SCHEMA=ms_${n}_<your-key>, and drop your schema when done. Drive /tdd for logic. Keep pnpm check green.`

const ITEMS = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: { type: "string", description: "kebab-case, unique" },
          title: { type: "string" },
          brief: {
            type: "string",
            description:
              "what to build, acceptance criteria from the spec, files/areas it owns",
          },
          wave: {
            type: "integer",
            description:
              "0-based; items in a wave run in parallel and must not overlap files",
          },
        },
        required: ["key", "title", "brief", "wave"],
      },
    },
  },
  required: ["items"],
}
const BUILT = {
  type: "object",
  properties: {
    branch: { type: "string" },
    summary: { type: "string" },
    checkGreen: { type: "boolean" },
    questions: {
      type: "array",
      items: { type: "string" },
      description:
        "product decisions the spec does not settle, with the choice you made meanwhile",
    },
  },
  required: ["branch", "summary", "checkGreen", "questions"],
}
const FINDINGS = {
  type: "object",
  properties: {
    blocking: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          where: { type: "string" },
        },
        required: ["title", "detail"],
      },
    },
    nonBlocking: { type: "array", items: { type: "string" } },
    screenshots: {
      type: "array",
      items: { type: "string" },
      description:
        "paths of screenshots committed under apps/site/docs/screenshots/",
    },
  },
  required: ["blocking", "nonBlocking"],
}

// ── Plan ──
phase("Plan")
let items = args.items
const planned = await agent(
  `${RULES}\n\nYou are the lead for Phase ${n} "${title}". Fetch origin, create branch ${branch} from origin/${BASE} (or reuse it if it exists) and push it. ${items ? "The work items are given below; only cut the branch." : `Split the phase section of the spec into 2–8 work items that coding agents can build independently. Put items that share files, or depend on each other, in later waves. Each brief must carry the exact acceptance criteria from the spec.`}\n\n${items ? JSON.stringify(items) : ""}`,
  { label: `plan ${n}`, schema: ITEMS, ...CODER }
)
items = items || planned.items
log(
  `Phase ${n}: ${items.length} items in ${new Set(items.map((i) => i.wave)).size} waves on ${branch}`
)

// ── Build, wave by wave ──
const questions = []
const waves = [...new Set(items.map((i) => i.wave))].sort((a, b) => a - b)
for (const w of waves) {
  const wave = items.filter((i) => i.wave === w)
  const built = await parallel(
    wave.map(
      (it) => () =>
        agent(
          `${RULES}\n\nWork item "${it.title}" (key ${it.key}) of Phase ${n}.\n${it.brief}\n\nIn your worktree: git fetch, then create wip/${n}-${slug}-${it.key} from origin/${branch}. Build it test-first, run pnpm check, commit (conventional commits), and push the branch. If the spec leaves a product decision open, make the most conservative choice consistent with the spec and the ADRs, and list it in "questions".`,
          {
            label: `build ${it.key}`,
            phase: "Build",
            isolation: "worktree",
            schema: BUILT,
            ...CODER,
          }
        )
    )
  )
  const ok = built.filter(Boolean)
  ok.forEach((b) => questions.push(...b.questions))
  await agent(
    `${RULES}\n\nIntegrate wave ${w} of Phase ${n}: merge these branches into ${branch} (fetch first): ${ok.map((b) => b.branch).join(", ")}. Resolve conflicts keeping both intents, run pnpm install, pnpm check and the migration check, fix anything red, then push ${branch} and delete the merged wip branches from origin. Summaries:\n${ok.map((b) => `- ${b.branch}: ${b.summary}`).join("\n")}`,
    { label: `integrate wave ${w}`, phase: "Build", ...CODER }
  )
}

// ── Advise ──
let decisions = []
if (questions.length) {
  const advice = await agent(
    `${RULES}\n\nYou are the product/UX advisor for the Site Builder. Coders made these interim choices where the spec was silent. For each, decide (keep or change), in one or two sentences, consistent with the spec, ADRs and glossary:\n${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`,
    {
      label: "advisor",
      phase: "Advise",
      model: "fable",
      schema: {
        type: "object",
        properties: {
          decisions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                decision: { type: "string" },
                changeNeeded: { type: "boolean" },
              },
              required: ["question", "decision", "changeNeeded"],
            },
          },
        },
        required: ["decisions"],
      },
    }
  )
  decisions = advice?.decisions ?? []
  const changes = decisions.filter((d) => d.changeNeeded)
  if (changes.length)
    await agent(
      `${RULES}\n\nOn ${branch}, apply these advisor decisions, keep pnpm check green, push:\n${changes.map((d) => `- ${d.question} → ${d.decision}`).join("\n")}`,
      { label: "apply advice", phase: "Advise", ...CODER }
    )
}

// ── Review, fix up to 2 rounds ──
let leftovers = []
let backlog = []
let shots = []
for (let round = 0; round <= 2; round++) {
  const [code, ux] = await parallel([
    () =>
      agent(
        `${RULES}\n\nCode review of ${branch} against origin/${BASE} for Phase ${n} "${title}". Run /code-review (Standards + Spec, where Spec is the phase section and its acceptance criteria). Blocking = bugs, spec misses, failing checks, security or data-loss risks, ADR violations. Everything else is non-blocking.${
          round === 0
            ? ` The browser acceptance suite is outside pnpm check, so run it once before the checkpoint PR: \`pnpm --filter site test:e2e\` with DATABASE_URL pointing at the scratch pm_milestone database (see apps/site/e2e/theme/support/env.ts). A failing acceptance test is blocking. Skip this only when apps/site has no test:e2e script.`
            : ""
        }`,
        {
          label: `code review r${round}`,
          phase: "Review",
          model: "opus",
          effort: "high",
          schema: FINDINGS,
        }
      ),
    () =>
      agent(
        `${RULES}\n\nUX review of ${branch} for Phase ${n} "${title}". Check it out in a worktree, run the app (scratch schema, DEV_SIGN_IN=1, sign in via /auth/dev), and drive it with headless Chromium (playwright-core; Chromium at ~/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome). Judge against the spec's UX rules, WCAG 2.2 AA and the audience (Staff Users who are not designers). Commit key screenshots under apps/site/docs/screenshots/${n}-${slug}/ and push. Blocking = broken flows, a11y failures, spec UX misses.`,
        {
          label: `ux review r${round}`,
          phase: "Review",
          model: "fable",
          schema: FINDINGS,
        }
      ),
  ])
  const blocking = [...(code?.blocking ?? []), ...(ux?.blocking ?? [])]
  backlog.push(...(code?.nonBlocking ?? []), ...(ux?.nonBlocking ?? []))
  shots = ux?.screenshots ?? shots
  log(`Review round ${round}: ${blocking.length} blocking`)
  if (!blocking.length) {
    leftovers = []
    break
  }
  leftovers = blocking
  if (round === 2) break
  await agent(
    `${RULES}\n\nFix these blocking review findings on ${branch}, test-first where it's logic, keep pnpm check green, push:\n${blocking.map((f) => `- ${f.title}${f.where ? ` (${f.where})` : ""}: ${f.detail}`).join("\n")}`,
    { label: `fix r${round}`, phase: "Review", ...CODER }
  )
}

// ── Ship ──
phase("Ship")
const pr = await agent(
  `${RULES}\n\nOpen a PR from ${branch} into ${BASE} titled "Phase ${n}: ${title}" (use the /pr skill for the body). Include: what was built per item, screenshots (${shots.join(", ") || "none"}), "Decisions made during the build" (${JSON.stringify(decisions)}), "Carried forward" leftovers (${JSON.stringify(leftovers.map((l) => l.title))}), and the non-blocking backlog (${JSON.stringify(backlog.slice(0, 30))}). End the body with:\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\nThen merge it with \`gh pr merge --merge\` and return the PR URL only.`,
  { label: "checkpoint PR", ...CODER }
)
return {
  n,
  slug,
  branch,
  pr,
  decisions,
  leftovers: leftovers.map((l) => l.title),
  backlog,
}
