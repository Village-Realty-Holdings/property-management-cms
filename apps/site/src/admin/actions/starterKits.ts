"use server"

import { revalidatePath } from "next/cache"

import { requireStaff } from "../session"
import {
  applyKitAs,
  reviewKitAs,
  type KitAnswers,
  type KitResult,
  type KitReview,
} from "../starterKits"

/**
 * The Starter Kits screen's Server Actions (apps/site ADR-0009). Each runs
 * as the Staff User (ADR-0002) and checks the answers again.
 */

/** What applying the kit would do, for the form's last step. Writes nothing. */
export async function reviewStarterKit(
  answers: KitAnswers
): Promise<KitReview> {
  const { payload, as } = await requireStaff()
  return reviewKitAs(payload, as, answers)
}

/** Sets the Site up from the kit. It touches the Brand, SEO, the Theme and Pages. */
export async function applyStarterKit(answers: KitAnswers): Promise<KitResult> {
  const { payload, as } = await requireStaff()
  const result = await applyKitAs(payload, as, answers)
  if (result.outcomes.length > 0) {
    revalidatePath("/admin", "layout")
    revalidatePath("/", "layout")
  }
  return result
}
