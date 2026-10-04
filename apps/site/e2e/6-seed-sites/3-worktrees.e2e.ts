import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { parse } from "dotenv"
import { beforeAll, describe, expect, it } from "vitest"

import { parseWorktreeList, type Worktree } from "./match"
import { REPO_ROOT, SITES_BRANCH } from "./support/env"
import { mustRun, runCommand, tail, type Result } from "./support/scratch"
import { SITES, type SiteSpec } from "./support/sites"

/**
 * Phase 6 acceptance: each Site gets its own worktree for local runs,
 * `../pm-warren-beach`, `../pm-avada` and `../pm-beachside`, on
 * milestone/site-builder, each with its env file, made by
 * `pnpm sites:worktrees`. Running it again changes nothing.
 *
 * This file runs the real command (it is idempotent, and those worktrees are
 * where the Sites are meant to live), then checks what it made. It never
 * starts a Site from them or seeds them: they may hold a real Site's Media
 * and env. Running all three at the same time from worktrees is checked in
 * 2-sites.e2e.ts, on scratch worktrees of this checkout.
 */

const git = (args: readonly string[]) =>
  mustRun("git", args, { cwd: REPO_ROOT, timeout: 120_000 })

async function worktrees(): Promise<Worktree[]> {
  return parseWorktreeList(await git(["worktree", "list", "--porcelain"]))
}

/**
 * The checkouts `../pm-<slug>` can be relative to: this one, and the main
 * worktree (the first in the list).
 */
async function bases(): Promise<string[]> {
  const main = (await worktrees())[0]?.path
  return [...new Set([REPO_ROOT, main].filter((p): p is string => !!p))].map(
    (base) => path.dirname(path.resolve(base))
  )
}

async function worktreeOf(site: SiteSpec): Promise<Worktree | undefined> {
  const parents = await bases()
  return (await worktrees()).find(
    (tree) =>
      path.basename(tree.path) === `pm-${site.slug}` &&
      parents.includes(path.dirname(path.resolve(tree.path)))
  )
}

const envFileOf = (tree: Worktree, site: SiteSpec) =>
  path.join(tree.path, "apps", "site", `.env.${site.slug}`)

const sitesWorktrees = (): Promise<Result> =>
  runCommand("pnpm", ["sites:worktrees"], {
    cwd: REPO_ROOT,
    env: { ...process.env, HUSKY: "0" },
    timeout: 1_800_000,
  })

let firstRun: Result
const envAfterFirstRun = new Map<string, string>()

beforeAll(async () => {
  firstRun = await sitesWorktrees()
}, 1_800_000)

describe("pnpm sites:worktrees", () => {
  it("succeeds", () => {
    expect(firstRun.code, tail(firstRun)).toBe(0)
  })

  it.each(SITES.map((site) => [site.slug, site] as const))(
    "makes ../pm-%s, on milestone/site-builder, installed",
    async (_slug, site) => {
      const tree = await worktreeOf(site)
      expect(tree, `a worktree named pm-${site.slug}`).toBeDefined()
      expect(existsSync(path.join(tree!.path, "node_modules"))).toBe(true)
      expect(existsSync(path.join(tree!.path, "apps", "site"))).toBe(true)

      if (tree!.branch !== SITES_BRANCH) {
        // Git checks a branch out in one worktree at a time, so the Sites'
        // worktrees may follow it detached: at the branch's commit, or one
        // it has since moved past.
        const tips = await Promise.all(
          [SITES_BRANCH, `origin/${SITES_BRANCH}`].map(async (ref) =>
            (
              await runCommand("git", ["rev-parse", "--verify", ref], {
                cwd: REPO_ROOT,
              })
            ).stdout.trim()
          )
        )
        const onBranch = await Promise.all(
          tips
            .filter(Boolean)
            .map(
              async (tip) =>
                (
                  await runCommand(
                    "git",
                    ["merge-base", "--is-ancestor", tree!.head, tip],
                    { cwd: REPO_ROOT }
                  )
                ).code === 0
            )
        )
        expect(
          onBranch.some(Boolean),
          `pm-${site.slug} is at ${tree!.head}, on branch ${tree!.branch ?? "(detached)"}`
        ).toBe(true)
      }
    }
  )

  it.each(SITES.map((site) => [site.slug, site] as const))(
    "gives pm-%s its env file, with the Site's own schema and port",
    async (_slug, site) => {
      const tree = await worktreeOf(site)
      expect(tree).toBeDefined()
      const file = envFileOf(tree!, site)
      expect(existsSync(file), file).toBe(true)
      const contents = readFileSync(file, "utf8")
      envAfterFirstRun.set(site.slug, contents)
      const env = parse(contents)
      expect(env.DATABASE_SCHEMA).toBe(site.schema)
      expect(env.PORT).toBe(String(site.port))
      if (env.SITE_URL) {
        expect(new URL(env.SITE_URL).port).toBe(String(site.port))
      }
    }
  )

  it("gives the three Sites three different worktrees, schemas and ports", async () => {
    const trees = await Promise.all(SITES.map(worktreeOf))
    expect(new Set(trees.map((tree) => tree?.path)).size).toBe(3)
    expect(new Set(SITES.map((site) => site.schema)).size).toBe(3)
    expect(new Set(SITES.map((site) => site.port)).size).toBe(3)
  })

  it("changes nothing when run again: no new worktrees, env files kept", async () => {
    // Other worktrees (agents', scratch ones) come and go: only the Sites'.
    const sitePaths = async () =>
      (await worktrees())
        .map((tree) => tree.path)
        .filter((treePath) => /^pm-/.test(path.basename(treePath)))
        .sort()
    const before = await sitePaths()
    const again = await sitesWorktrees()
    expect(again.code, tail(again)).toBe(0)
    expect(await sitePaths()).toEqual(before)
    for (const site of SITES) {
      const tree = await worktreeOf(site)
      expect(tree).toBeDefined()
      // A User's own values (a database URL, a secret) survive.
      expect(readFileSync(envFileOf(tree!, site), "utf8")).toBe(
        envAfterFirstRun.get(site.slug)
      )
    }
  }, 1_800_000)
})
