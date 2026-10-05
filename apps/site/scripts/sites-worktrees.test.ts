import { describe, expect, it } from "vitest"

import {
  parseWorktrees,
  planWorktrees,
  runPlan,
  summarize,
  type PlanDeps,
  type PlanIo,
  type Step,
} from "./sites-worktrees"

const MAIN = "/code/property-management-cms"

const PORCELAIN = `worktree ${MAIN}
HEAD 1111111111111111111111111111111111111111
branch refs/heads/milestone/site-builder

worktree ${MAIN}/.claude/worktrees/agent-1
HEAD 2222222222222222222222222222222222222222
detached

`

function deps(overrides: Partial<PlanDeps> = {}): PlanDeps {
  return {
    worktrees: parseWorktrees(PORCELAIN),
    exists: () => false,
    refExists: (ref) => ref === "milestone/site-builder",
    ...overrides,
  }
}

const git = (...args: string[]): Step => ({ kind: "git", cwd: MAIN, args })

describe("parseWorktrees", () => {
  it("reads the path and branch of each worktree, main first", () => {
    expect(parseWorktrees(PORCELAIN)).toEqual([
      { path: MAIN, branch: "milestone/site-builder" },
      { path: `${MAIN}/.claude/worktrees/agent-1`, branch: undefined },
    ])
  })
})

describe("planWorktrees", () => {
  it("makes one detached worktree per Site next to the main checkout, then installs and gives each its env", () => {
    const steps = planWorktrees(deps())
    expect(steps).toEqual([
      git("worktree", "prune"),
      git(
        "worktree",
        "add",
        "--detach",
        "/code/pm-warren-beach",
        "milestone/site-builder"
      ),
      git(
        "worktree",
        "add",
        "--detach",
        "/code/pm-avada",
        "milestone/site-builder"
      ),
      git(
        "worktree",
        "add",
        "--detach",
        "/code/pm-beachside",
        "milestone/site-builder"
      ),
      { kind: "install", cwd: "/code/pm-warren-beach" },
      {
        kind: "env",
        slug: "warren-beach",
        to: "/code/pm-warren-beach/apps/site/.env.warren-beach",
        sources: [
          `${MAIN}/apps/site/.env.warren-beach`,
          `${MAIN}/apps/site/.env.warren-beach.example`,
          "/code/pm-warren-beach/apps/site/.env.warren-beach.example",
        ],
      },
      { kind: "install", cwd: "/code/pm-avada" },
      expect.objectContaining({ kind: "env", slug: "avada" }),
      { kind: "install", cwd: "/code/pm-beachside" },
      expect.objectContaining({ kind: "env", slug: "beachside" }),
    ])
  })

  it("falls back to origin/milestone/site-builder when there is no local branch", () => {
    const steps = planWorktrees(
      deps({ refExists: (ref) => ref === "origin/milestone/site-builder" })
    )
    expect(steps).toContainEqual(
      git(
        "worktree",
        "add",
        "--detach",
        "/code/pm-avada",
        "origin/milestone/site-builder"
      )
    )
  })

  it("stops when the branch is nowhere", () => {
    expect(() => planWorktrees(deps({ refExists: () => false }))).toThrow(
      /milestone\/site-builder/
    )
  })

  it("changes nothing when the worktrees, installs and env files are there", () => {
    const worktrees = [
      ...parseWorktrees(PORCELAIN),
      ...["warren-beach", "avada", "beachside"].map((slug) => ({
        path: `/code/pm-${slug}`,
        branch: undefined,
      })),
    ]
    const steps = planWorktrees(deps({ worktrees, exists: () => true }))
    // Only the harmless prune: nothing to add, install or copy.
    expect(steps).toEqual([git("worktree", "prune")])
  })

  it("adds only what is missing", () => {
    const worktrees = [
      ...parseWorktrees(PORCELAIN),
      { path: "/code/pm-avada", branch: undefined },
    ]
    const present = new Set([
      "/code/pm-avada/node_modules",
      "/code/pm-avada/apps/site/.env.avada",
    ])
    const steps = planWorktrees(
      deps({ worktrees, exists: (file) => present.has(file) })
    )
    expect(
      steps.filter((s) => s.kind === "git" && s.args[1] === "add")
    ).toEqual([
      git(
        "worktree",
        "add",
        "--detach",
        "/code/pm-warren-beach",
        "milestone/site-builder"
      ),
      git(
        "worktree",
        "add",
        "--detach",
        "/code/pm-beachside",
        "milestone/site-builder"
      ),
    ])
    expect(steps.filter((s) => s.kind === "install").map((s) => s.cwd)).toEqual(
      ["/code/pm-warren-beach", "/code/pm-beachside"]
    )
    expect(steps.filter((s) => s.kind === "env").map((s) => s.slug)).toEqual([
      "warren-beach",
      "beachside",
    ])
  })

  it("refuses a folder that is in the way and is not a worktree", () => {
    expect(() =>
      planWorktrees(deps({ exists: (file) => file === "/code/pm-avada" }))
    ).toThrow(/pm-avada.*not a worktree/)
  })

  it("keeps an env file that is there: a User's own values survive", () => {
    const steps = planWorktrees(
      deps({
        worktrees: [
          ...parseWorktrees(PORCELAIN),
          { path: "/code/pm-avada", branch: undefined },
        ],
        exists: (file) =>
          file === "/code/pm-avada/apps/site/.env.avada" ||
          file === "/code/pm-avada/node_modules",
      })
    )
    expect(steps.some((s) => s.kind === "env" && s.slug === "avada")).toBe(
      false
    )
  })
})

/** An io whose files are in memory and whose git and install calls are recorded. */
function memoryIo(files: Record<string, string>) {
  const calls: string[] = []
  const io: PlanIo = {
    git: (cwd, args) => {
      calls.push(`git ${args.join(" ")}`)
    },
    install: (cwd) => {
      calls.push(`install ${cwd}`)
    },
    exists: (file) => file in files,
    readFile: (file) => files[file],
    writeFile: (file, contents) => {
      files[file] = contents
    },
  }
  return { io, calls, files }
}

const envStep = (slug: string): Step => ({
  kind: "env",
  slug,
  to: `/code/pm-${slug}/apps/site/.env.${slug}`,
  sources: [
    `${MAIN}/apps/site/.env.${slug}`,
    `${MAIN}/apps/site/.env.${slug}.example`,
    `/code/pm-${slug}/apps/site/.env.${slug}.example`,
  ],
})

describe("runPlan", () => {
  it("runs each step in order", () => {
    const { io, calls } = memoryIo({})
    runPlan(
      [git("worktree", "prune"), { kind: "install", cwd: "/code/pm-avada" }],
      io
    )
    expect(calls).toEqual(["git worktree prune", "install /code/pm-avada"])
  })

  it("copies the Site's own env file from the main checkout when it has one", () => {
    const { io, files } = memoryIo({
      [`${MAIN}/apps/site/.env.avada`]:
        "DATABASE_URL=postgres://u:p@localhost/pm_mine\nDATABASE_SCHEMA=avada\nPORT=3002\n",
      [`${MAIN}/apps/site/.env.avada.example`]: "DATABASE_SCHEMA=avada\n",
    })
    runPlan([envStep("avada")], io)
    expect(files["/code/pm-avada/apps/site/.env.avada"]).toContain("pm_mine")
  })

  it("starts from the example when there is no env file", () => {
    const { io, files } = memoryIo({
      "/code/pm-avada/apps/site/.env.avada.example":
        "DATABASE_URL=postgres://u:p@localhost/property_management_sites\nDATABASE_SCHEMA=avada\nPORT=3002\n",
    })
    runPlan([envStep("avada")], io)
    expect(files["/code/pm-avada/apps/site/.env.avada"]).toContain(
      "DATABASE_SCHEMA=avada"
    )
  })

  it("refuses an env file that names the live-pm-sites database", () => {
    const { io, files } = memoryIo({
      [`${MAIN}/apps/site/.env.avada`]:
        "DATABASE_URL=postgres://u:p@localhost:5432/live-pm-sites\nDATABASE_SCHEMA=avada\n",
    })
    expect(() => runPlan([envStep("avada")], io)).toThrow(/live-pm-sites/)
    expect(files["/code/pm-avada/apps/site/.env.avada"]).toBeUndefined()
  })

  it("never overwrites an env file", () => {
    const { io, files } = memoryIo({
      [`${MAIN}/apps/site/.env.avada`]: "DATABASE_SCHEMA=avada\n",
      "/code/pm-avada/apps/site/.env.avada": "MINE=1\n",
    })
    runPlan([envStep("avada")], io)
    expect(files["/code/pm-avada/apps/site/.env.avada"]).toBe("MINE=1\n")
  })

  it("says so when there is nothing to copy from", () => {
    const { io } = memoryIo({})
    expect(() => runPlan([envStep("avada")], io)).toThrow(/\.env\.avada/)
  })
})

describe("summarize", () => {
  it("lists each Site's worktree, port and command", () => {
    const text = summarize(MAIN)
    expect(text).toContain("/code/pm-warren-beach")
    expect(text).toMatch(/3001/)
    expect(text).toMatch(/3002/)
    expect(text).toMatch(/3003/)
    expect(text).toContain("pnpm site avada dev")
  })
})
