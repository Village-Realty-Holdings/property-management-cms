/**
 * Gives each Site its own worktree for local runs (site-builder milestone,
 * Phase 6):
 *
 *   pnpm sites:worktrees        (from the repo root, or from apps/site)
 *
 * It makes `../pm-warren-beach`, `../pm-avada` and `../pm-beachside`, next to
 * the main checkout, on milestone/site-builder; installs each; and gives each
 * its env file (apps/site/.env.<slug>): a copy of the main checkout's own
 * file when it has one, otherwise of the committed .env.<slug>.example. Then
 * it prints the ports: 3001, 3002 and 3003.
 *
 * It is safe to run again. A worktree, an install or an env file that is
 * already there is left alone (an env file is never overwritten, so a
 * User's own database URL and secret survive), and an env file that names the
 * property_management_site database is refused.
 *
 * Git keeps a branch checked out in one worktree at a time, and the main
 * checkout usually has milestone/site-builder, so the Sites' worktrees are
 * detached at the branch's commit. To move one forward:
 *   git -C ../pm-avada checkout --detach milestone/site-builder
 */
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { parse } from "dotenv"

export const SITES_BRANCH = "milestone/site-builder"

/** The Sites, with the port each serves on (apps/site/.env.<slug>.example). */
export const SITES = [
  { slug: "warren-beach", port: 3001 },
  { slug: "avada", port: 3002 },
  { slug: "beachside", port: 3003 },
] as const

const PROTECTED_DATABASE = "property_management_site"

export type Worktree = { path: string; branch: string | undefined }

/** `git worktree list --porcelain`: the main checkout comes first. */
export function parseWorktrees(porcelain: string): Worktree[] {
  return porcelain
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n")
      const tree = lines.find((line) => line.startsWith("worktree "))!
      const branch = lines.find((line) => line.startsWith("branch "))
      return {
        path: tree.slice("worktree ".length),
        branch: branch?.slice("branch refs/heads/".length),
      }
    })
}

export type Step =
  | { kind: "git"; cwd: string; args: string[] }
  | { kind: "install"; cwd: string }
  | {
      kind: "env"
      slug: string
      /** The env file to make. */
      to: string
      /** Where to copy it from: the first that exists. */
      sources: string[]
    }

export type PlanDeps = {
  /** Every worktree of the repo, the main checkout first. */
  worktrees: Worktree[]
  exists: (file: string) => boolean
  refExists: (ref: string) => boolean
}

/** Where a Site's worktree goes: `../pm-<slug>` of the main checkout. */
export function worktreePath(mainRoot: string, slug: string): string {
  return path.resolve(mainRoot, "..", `pm-${slug}`)
}

/** What to do to bring the three worktrees to where they should be. */
export function planWorktrees({
  worktrees,
  exists,
  refExists,
}: PlanDeps): Step[] {
  const main = worktrees[0]?.path
  if (!main) throw new Error("git lists no worktrees. Run this in the repo.")

  const ref = [SITES_BRANCH, `origin/${SITES_BRANCH}`].find(refExists)
  const registered = new Set(worktrees.map((tree) => path.resolve(tree.path)))

  const steps: Step[] = [
    { kind: "git", cwd: main, args: ["worktree", "prune"] },
  ]
  const adds: Step[] = []
  const finish: Step[] = []
  for (const { slug } of SITES) {
    const dir = worktreePath(main, slug)
    if (!registered.has(dir)) {
      if (exists(dir)) {
        throw new Error(
          `${dir} exists but is not a worktree of this repo. Move it away and run again.`
        )
      }
      if (!ref) {
        throw new Error(
          `Neither ${SITES_BRANCH} nor origin/${SITES_BRANCH} exists here. Fetch it first: git fetch origin ${SITES_BRANCH}`
        )
      }
      adds.push({
        kind: "git",
        cwd: main,
        args: ["worktree", "add", "--detach", dir, ref],
      })
    }
    if (!exists(path.join(dir, "node_modules"))) {
      finish.push({ kind: "install", cwd: dir })
    }
    const envFile = `.env.${slug}`
    const to = path.join(dir, "apps", "site", envFile)
    if (!exists(to)) {
      finish.push({
        kind: "env",
        slug,
        to,
        sources: [
          path.join(main, "apps", "site", envFile),
          path.join(main, "apps", "site", `${envFile}.example`),
          `${to}.example`,
        ],
      })
    }
  }
  return [...steps, ...adds, ...finish]
}

export type PlanIo = {
  git: (cwd: string, args: string[]) => void
  install: (cwd: string) => void
  exists: (file: string) => boolean
  /** The file's contents, or undefined when it doesn't exist. */
  readFile: (file: string) => string | undefined
  writeFile: (file: string, contents: string) => void
}

/** Carries out a plan. Env files are copied, never overwritten. */
export function runPlan(steps: Step[], io: PlanIo): void {
  for (const step of steps) {
    if (step.kind === "git") {
      io.git(step.cwd, step.args)
    } else if (step.kind === "install") {
      io.install(step.cwd)
    } else {
      if (io.exists(step.to)) continue
      const source = step.sources.find(
        (file) => io.readFile(file) !== undefined
      )
      const contents = source && io.readFile(source)
      if (!source || contents === undefined) {
        throw new Error(
          `No ${path.basename(step.to)} or ${path.basename(step.to)}.example to copy for ${step.slug}.`
        )
      }
      refuseProtectedDatabase(contents, source)
      io.writeFile(step.to, contents)
    }
  }
}

function refuseProtectedDatabase(contents: string, source: string) {
  const url = parse(contents).DATABASE_URL
  if (!url) return
  let database: string
  try {
    database = new URL(url).pathname.replace(/^\//, "")
  } catch {
    return
  }
  if (database === PROTECTED_DATABASE) {
    throw new Error(
      `${source} points DATABASE_URL at the ${PROTECTED_DATABASE} database. The Sites use their own database (for example property_management_sites): fix it and run again.`
    )
  }
}

/** What to tell the User when the worktrees are ready. */
export function summarize(mainRoot: string): string {
  const lines = ["Site worktrees:"]
  for (const { slug, port } of SITES) {
    lines.push(
      `  ${worktreePath(mainRoot, slug)}  port ${port}  (cd there: pnpm site ${slug} seed, then pnpm site ${slug} dev, http://localhost:${port}/admin)`
    )
  }
  return lines.join("\n")
}

function main() {
  const cwd = path.resolve(fileURLToPath(new URL("..", import.meta.url)))
  const run = (dir: string, command: string, args: string[]) =>
    execFileSync(command, args, {
      cwd: dir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    })

  const worktrees = parseWorktrees(
    run(cwd, "git", ["worktree", "list", "--porcelain"])
  )
  const mainRoot = worktrees[0]!.path
  const refExists = (ref: string) => {
    try {
      run(mainRoot, "git", ["rev-parse", "--verify", "--quiet", ref])
      return true
    } catch {
      return false
    }
  }

  try {
    const steps = planWorktrees({ worktrees, exists: existsSync, refExists })
    runPlan(steps, {
      git: (dir, args) => {
        console.log(`git ${args.join(" ")}`)
        execFileSync("git", args, { cwd: dir, stdio: "inherit" })
      },
      install: (dir) => {
        console.log(`pnpm install in ${dir}`)
        execFileSync("pnpm", ["install", "--prefer-offline"], {
          cwd: dir,
          stdio: "inherit",
          env: { ...process.env, HUSKY: "0" },
        })
      },
      exists: existsSync,
      readFile: (file) => {
        try {
          return readFileSync(file, "utf8")
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") return
          throw error
        }
      },
      writeFile: (file, contents) => {
        console.log(`writing ${file}`)
        writeFileSync(file, contents, { flag: "wx" })
      },
    })
  } catch (error) {
    console.error((error as Error).message)
    process.exit(1)
  }
  console.log(summarize(mainRoot))
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main()
}
