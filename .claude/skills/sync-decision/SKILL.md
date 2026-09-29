---
name: sync-decision
description: Bring this repo's design docs back in line after a decision changes — find every ADR, CONTEXT.md term, module-layout section, plan and skill that restates the old decision, record the new one as an ADR, and update the rest so nothing contradicts it. Use whenever the user reverses or replaces an earlier choice ("let's do X instead", "that's wrong", "we took a wrong turn", "scrap the preview keys"), asks to "keep the plan and docs in sync", "update the docs with what we decided", or after a design discussion ends somewhere different from what docs/ says — even if they don't mention ADRs.
---

# sync-decision

The design lives in several places that repeat each other: ADRs in
`docs/adr/`, the glossary in `CONTEXT.md`, the module design in
`docs/module-layout.md`, wave plans in `docs/plans/`, and the project skills
in `.claude/skills/`. When a decision changes, fixing only the file in front
of you leaves the others quietly contradicting it, and the next session (or
worker) builds the old design. This skill makes the change everywhere at once.

It changes docs only. Code that has to change goes into the plan as work to
do, not into this edit.

## 1. Pin down the change

Write two lines before touching anything:

- **Was:** the old decision, as the docs state it.
- **Now:** the new decision, in the user's terms.

If the conversation went through several directions, the "now" is where it
ended, not an intermediate stop. If you can't state it in one sentence, or it
depends on something still undecided, ask first. The `align` skill is good
for this when the change is large.

## 2. Find every place that states the old decision

Search wide, because the same decision is phrased differently in each file:

- The ADR numbers involved (`ADR-0007`, `0007-`).
- Key terms, env vars, file paths, route paths and collection or field names
  tied to the old design (e.g. `CMS_PREVIEW_KEY`, `draftMode`, `/api/preview`,
  `purpose`).
- `docs/`, `CONTEXT.md`, `AGENTS.md`, `CLAUDE.md`, `apps/*/AGENTS.md`,
  `.claude/skills/*/SKILL.md`, and doc comments in code that cite an ADR.

Use `grep -rniE` over those paths, excluding `node_modules`, `.next` and
`migrations`. List the hits before editing, so the user can see the blast
radius.

## 3. Update each kind of doc the way it's meant to change

- **ADRs are a record.** Don't rewrite an old ADR's decision. Write a new one
  (next number, same format as the latest: a title that states the decision,
  a paragraph saying what and why, `## Considered Options` including the old
  design and why it lost, `## Consequences`). Then edit the old ADRs only
  where their text would now mislead: a sentence pointing to the new ADR, or
  a corrected consequence.
- **`CONTEXT.md` is the current language.** Add, change or remove terms, with
  `_Avoid_:` lines for words that now mean the wrong thing.
- **`docs/module-layout.md` is the current design.** Change it to describe the
  new design as if it had always been the plan, citing the new ADR.
- **Plans:** rewrite the active, unbuilt plan. Leave plans for waves already
  merged alone. They're history. If the change removes built code, the
  active plan needs a removal step listing it.
- **Skills and tooling docs describe what runs today.** If the code hasn't
  changed yet, leave them and add them to the plan's removal or update step
  instead.

If the `domain-modeling` skill is available, follow its conventions for ADRs
and `CONTEXT.md`. Match the repo's prose: plain words, short sentences.

## 4. Check nothing still contradicts it

Re-run the step 2 searches. Every remaining hit should be either history (a
merged plan, an old ADR's rejected option) or something the plan now lists
as work. Then show the user `git diff --stat` and a short list: the new ADR,
each file changed and why, and anything you deliberately left alone.

Don't commit unless the user asks. When they do, use one `docs:` commit, on
the branch the plan names if it exists.
