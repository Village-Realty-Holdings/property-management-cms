/**
 * A heading split around its accent word: the text before it, the word as
 * the heading spells it, and the text after. The first match wins, found
 * regardless of case and taken literally (an accent word is typed by users,
 * not a pattern). Null when there is no accent word or it is not in the
 * heading, so the heading is then plain.
 */
export function splitAccent(
  heading: string,
  accentWord: string | null | undefined
): [before: string, word: string, after: string] | null {
  const word = accentWord?.trim()
  if (!word) return null
  const at = heading.toLowerCase().indexOf(word.toLowerCase())
  if (at < 0) return null
  return [
    heading.slice(0, at),
    heading.slice(at, at + word.length),
    heading.slice(at + word.length),
  ]
}
