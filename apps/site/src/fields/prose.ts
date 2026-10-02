/**
 * `custom` for a text field that holds a value with a meaning of its own (a
 * path, a URL, an icon's name) instead of words a visitor reads. Replace Text
 * leaves such a field alone.
 */
export const NOT_PROSE = { prose: false } as const

/**
 * `custom` for a text field that holds a link's target: a Site path, an
 * anchor, or a full URL. It is not prose either. The Links tool lists these
 * fields and can point every use of a URL somewhere else.
 */
export const LINK = { prose: false, link: true } as const
