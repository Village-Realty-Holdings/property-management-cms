export const meta = {
  name: "site-builder-iteration",
  description:
    "Site Builder improvement iteration: Opus audit findings → work items → site-builder-phase build/review/PR → fresh Opus audit",
  whenToUse:
    "Site Builder milestone (map #34). args: { n } with n=0 for the Phase 7 audit only, n=1..3 for iterations (reads audit-n, writes audit-(n+1)).",
  phases: [
    {
      title: "Triage",
      detail: "turn the audit top findings into work items",
      model: "opus",
    },
    { title: "Iterate", detail: "run site-builder-phase on those items" },
    {
      title: "Audit",
      detail: "Opus audit of the three running Sites",
      model: "opus",
    },
  ],
}

const SPEC = "apps/site/docs/plans/site-builder-milestone.md"
const BASE = "milestone/site-builder"
const n = args.n
const RULES = `Repo: /home/al/Projects/Awayday/property-management-cms (app apps/site). Spec: ${SPEC} on ${BASE}. Never touch the property_management_site database or main.`

let result = null
if (n > 0) {
  phase("Triage")
  const triage = await agent(
    `${RULES}\n\nRead apps/site/docs/audits/audit-${n}.md on origin/${BASE}. Take its top 10–15 findings by impact (skip anything out of scope in the spec) and turn them into work items for coding agents: group related findings, keep items that touch the same files in later waves, and put the finding text and a concrete acceptance check in each brief. Log which findings you dropped and why in "dropped".`,
    {
      label: `triage audit-${n}`,
      model: "opus",
      effort: "high",
      schema: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                key: { type: "string" },
                title: { type: "string" },
                brief: { type: "string" },
                wave: { type: "integer" },
              },
              required: ["key", "title", "brief", "wave"],
            },
          },
          dropped: { type: "array", items: { type: "string" } },
        },
        required: ["items", "dropped"],
      },
    }
  )
  if (triage.dropped.length)
    log(
      `Dropped from audit-${n}: ${triage.dropped.length} findings (listed in the PR)`
    )
  phase("Iterate")
  result = await workflow(
    {
      scriptPath:
        "/home/al/Projects/Awayday/property-management-cms/.claude/workflows/site-builder-phase.js",
    },
    {
      n: `i${n}`,
      slug: `iteration-${n}`,
      title: `Improvement iteration ${n}`,
      items: triage.items,
    }
  )
}

phase("Audit")
const audit = await agent(
  `${RULES}\n\nAudit ${n === 0 ? "the completed build" : `the milestone after iteration ${n}`} (origin/${BASE}). Set up and run all three Sites (pnpm sites:worktrees, pnpm site <slug> seed, pnpm site <slug> dev on ports 3001–3003), sign in via /auth/dev, and drive the Admin, the Visual Editor and the public Site with headless Chromium. Audit: design and UX (Staff Users are not designers), code quality against AGENTS.md and the ADRs, WCAG 2.2 AA, performance of the Home pages, and fidelity of Warren Beach and Avada to research/brands/*/screenshots (recognisable, not pixel-perfect) and of Beachside to its brand. ${n > 0 ? `Also check whether audit-${n}'s addressed findings are really fixed.` : ""} Write apps/site/docs/audits/audit-${n + 1}.md with findings ranked by impact (each: title, evidence, where, suggested fix, effort), commit to a branch audit/${n + 1}, open and merge a PR into ${BASE} (end the body with "🤖 Generated with [Claude Code](https://claude.com/claude-code)"). Return the ranked top 15 titles.`,
  {
    label: `audit-${n + 1}`,
    model: "opus",
    effort: "high",
    schema: {
      type: "object",
      properties: {
        top: { type: "array", items: { type: "string" } },
        pr: { type: "string" },
      },
      required: ["top", "pr"],
    },
  }
)
return { n, iteration: result, audit }
